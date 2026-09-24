using Microsoft.AspNetCore.Hosting;

namespace Flagsweep.FunctionalTests.Api;

public class AuthConfigTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    protected override bool AuthenticateByDefault => false;

    [Fact]
    public async Task Status_ExposesConfiguredAuthType()
    {
        var status = await Client.GetFromJsonAsync<StatusResponse>("/api/status", Json);
        status!.AuthType.Should().Be("Password");
    }

    [Fact]
    public async Task Setup_DefaultConfig_AcceptsSixCharPassword()
    {
        var resp = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "a@b.com", password = "abc123" }
        );
        resp.IsSuccessStatusCode.Should().BeTrue();
    }

    private sealed record StatusResponse(bool IsSetup, string AuthType);
}

public class StrictPasswordConfigTests : IAsyncLifetime
{
    private sealed class StrictFactory : FunctionalTestFixture
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Auth:Password:RequiredLength", "12");
            builder.UseSetting("Auth:Password:RequireDigit", "true");
            base.ConfigureWebHost(builder);
        }
    }

    private StrictFactory _factory = null!;
    private HttpClient _client = null!;

    public async Task InitializeAsync()
    {
        _factory = new StrictFactory();
        await _factory.InitializeAsync();
        _client = _factory.CreateClient();
    }

    public async Task DisposeAsync()
    {
        _client.Dispose();
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Setup_PasswordShorterThanConfigured_Returns400()
    {
        var resp = await _client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "a@b.com", password = "short123" }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Setup_PasswordWithoutDigit_RejectedByIdentityPolicy()
    {
        var resp = await _client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "a@b.com", password = "longenoughpassword" }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Setup_PasswordMeetingConfiguredPolicy_Succeeds()
    {
        var resp = await _client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "a@b.com", password = "longenough123" }
        );
        resp.IsSuccessStatusCode.Should().BeTrue();
    }
}
