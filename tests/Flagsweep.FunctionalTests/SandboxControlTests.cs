using Flagsweep.Application.Flags;
using Flagsweep.Infrastructure.Persistence;
using Flagsweep.Infrastructure.Sandbox;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Flagsweep.FunctionalTests;

public class SandboxControlTests
{
    private const string Secret = "functional-test-secret";
    private const string FakeStore = "Endpoint=https://reset.example;Id=test;Secret=dGVzdA==";

    private sealed class ConfiguredFixture(params (string Key, string Value)[] settings)
        : FunctionalTestFixture
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            foreach (var (key, value) in settings)
                builder.UseSetting(key, value);
            base.ConfigureWebHost(builder);
        }
    }

    private sealed class Session(FunctionalTestFixture fixture) : FunctionalTestBase(fixture)
    {
        public HttpClient Http => Client;

        public Task<string> SetupAdminAsync() => SetupAndAuthAsync();

        public void SignOut() => ClearAuth();

        public Task<HttpResponseMessage> ResetAsync(string? secret)
        {
            var request = new HttpRequestMessage(HttpMethod.Post, "/api/sandbox/reset");
            if (secret is not null)
                request.Headers.Add(SandboxOptions.ControlSecretHeader, secret);
            return Client.SendAsync(request);
        }

        public async Task<bool> IsSetUpAsync()
        {
            var status = await Client.GetFromJsonAsync<StatusResponse>("/api/status", Json);
            return status!.IsSetup;
        }

        public async Task<int> CreateFakeConnectionWithFlagAsync(string flagId)
        {
            var connection = await CreateConnectionAsync(
                "Reset App",
                [new { name = "Dev", environmentKey = "dev" }],
                FakeStore
            );
            var created = await Client.PostAsJsonAsync(
                $"/api/connections/{connection.Id}/flags",
                new { id = flagId, labels = new[] { "dev" } }
            );
            created.EnsureSuccessStatusCode();
            return connection.Id;
        }

        public async Task<List<string>> FlagIdsAsync(int connectionId)
        {
            var page = await Client.GetFromJsonAsync<PagedResult<FlagDto>>(
                $"/api/connections/{connectionId}/flags?label=dev",
                Json
            );
            return page!.Items.Select(f => f.Id).ToList();
        }

        private sealed record StatusResponse(bool IsSetup, string AuthType);
    }

    private static async Task<(ConfiguredFixture Fixture, Session Session)> StartAsync(
        params (string, string)[] settings
    )
    {
        var fixture = new ConfiguredFixture(settings);
        await fixture.InitializeAsync();
        return (fixture, new Session(fixture));
    }

    [Fact]
    public async Task NormalInstance_HasNoResetEndpoint()
    {
        var (fixture, session) = await StartAsync();
        await using var _ = fixture;
        await session.SetupAdminAsync();

        var response = await session.ResetAsync(Secret);

        response
            .StatusCode.Should()
            .BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.MethodNotAllowed);
        (await session.IsSetUpAsync()).Should().BeTrue();
    }

    [Fact]
    public async Task SandboxAlone_HasNoResetEndpoint()
    {
        var (fixture, session) = await StartAsync(("Sandbox", "true"), ("E2E:Secret", Secret));
        await using var _ = fixture;
        await session.SetupAdminAsync();

        var response = await session.ResetAsync(Secret);

        response
            .StatusCode.Should()
            .BeOneOf(HttpStatusCode.NotFound, HttpStatusCode.MethodNotAllowed);
        (await session.IsSetUpAsync()).Should().BeTrue();
    }

    [Fact]
    public async Task E2EWithoutSandbox_RefusesToStart()
    {
        var start = () => StartAsync(("E2E:Enabled", "true"), ("E2E:Secret", Secret));

        (await start.Should().ThrowAsync<InvalidOperationException>()).WithMessage("*--sandbox*");
    }

    [Fact]
    public async Task E2EWithoutASecret_RefusesToStart()
    {
        var start = () => StartAsync(("Sandbox", "true"), ("E2E:Enabled", "true"));

        (await start.Should().ThrowAsync<InvalidOperationException>()).WithMessage("*E2E__Secret*");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("wrong-secret")]
    public async Task E2E_WithoutTheSecret_AnswersNotFoundAndKeepsTheData(string? secret)
    {
        var (fixture, session) = await StartAsync(
            ("Sandbox", "true"),
            ("E2E:Enabled", "true"),
            ("E2E:Secret", Secret)
        );
        await using var _ = fixture;
        await session.SetupAdminAsync();
        session.SignOut();

        var response = await session.ResetAsync(secret);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await session.IsSetUpAsync()).Should().BeTrue();
    }

    [Fact]
    public async Task E2E_WithTheSecret_ReturnsTheInstanceToFreshInstall()
    {
        var (fixture, session) = await StartAsync(
            ("Sandbox", "true"),
            ("E2E:Enabled", "true"),
            ("E2E:Secret", Secret)
        );
        await using var _ = fixture;
        await session.SetupAdminAsync();
        await session.CreateFakeConnectionWithFlagAsync("before-reset");
        session.SignOut();

        var response = await session.ResetAsync(Secret);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await session.IsSetUpAsync()).Should().BeFalse();

        using (var scope = fixture.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();
            var rowCounts = new Dictionary<string, int>
            {
                ["AuditEntries"] = await db.AuditEntries.CountAsync(),
                ["FlagOwners"] = await db.FlagOwners.CountAsync(),
                ["Environments"] = await db.Environments.CountAsync(),
                ["Connections"] = await db.Connections.CountAsync(),
                ["Invitations"] = await db.Invitations.CountAsync(),
                ["Users"] = await db.Users.IgnoreQueryFilters().CountAsync(),
                ["UserClaims"] = await db.UserClaims.CountAsync(),
                ["UserLogins"] = await db.UserLogins.CountAsync(),
                ["UserTokens"] = await db.UserTokens.CountAsync(),
            };
            rowCounts.Should().OnlyContain(table => table.Value == 0);
            db.Model.GetEntityTypes()
                .Should()
                .HaveCount(
                    rowCounts.Count,
                    "a new table has to be emptied by SandboxReset and counted here"
                );
        }

        await session.SetupAdminAsync();
        var connectionId = await session.CreateFakeConnectionWithFlagAsync("after-reset");
        (await session.FlagIdsAsync(connectionId)).Should().Equal("after-reset");
    }
}
