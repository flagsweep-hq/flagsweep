using Flagsweep.Application.Audit;
using Flagsweep.Application.Connections;
using Flagsweep.Domain.Models;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class MultiEnvironmentCreateTests : FunctionalTestBase
{
    public MultiEnvironmentCreateTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private Task<ConnectionDto> CreateConnectionWithEnvsAsync() =>
        CreateConnectionAsync(
            "Multi Env App",
            [
                new { name = "Dev", environmentKey = "dev" },
                new { name = "Staging", environmentKey = "staging" },
                new { name = "Prod", environmentKey = "prod" },
            ]
        );

    [Fact]
    public async Task CreateFlag_InSeveralEnvironments_WritesToEachLabel()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        var resp = await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new
            {
                id = "everywhere",
                labels = new[] { "dev", "staging", "prod" },
                isEnabled = false,
                description = "Shared across environments",
            }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        foreach (var label in new[] { "dev", "staging", "prod" })
        {
            var stored = await GetStoredFlagAsync("everywhere", label);
            stored.Should().NotBeNull($"the flag should exist in '{label}'");
            stored!.IsEnabled.Should().BeFalse();
            stored.Description.Should().Be("Shared across environments");
        }
    }

    [Fact]
    public async Task CreateFlag_InSeveralEnvironments_AuditsEachEnvironment()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new
            {
                id = "audited-everywhere",
                labels = new[] { "dev", "prod" },
                isEnabled = false,
            }
        );

        foreach (var env in connection.Environments.Where(e => e.EnvironmentKey != "staging"))
        {
            var entries = (
                await Client.GetFromJsonAsync<PagedResult<AuditEntryDto>>(
                    $"/api/connections/{connection.Id}/audit?environmentId={env.Id}",
                    Json
                )
            )!.Items.ToList();

            entries.Should().ContainSingle();
            entries[0].Changes.Single().Field.Should().Be(FlagChangeField.Created);
            entries[0].TriggeredByEmail.Should().NotBeNullOrEmpty();
        }
    }

    [Fact]
    public async Task CreateFlag_DuplicateLabels_WritesOncePerEnvironment()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new
            {
                id = "deduped",
                labels = new[] { "dev", "dev" },
                isEnabled = false,
            }
        );

        var devEnv = connection.Environments.Single(e => e.EnvironmentKey == "dev");
        var entries = (
            await Client.GetFromJsonAsync<PagedResult<AuditEntryDto>>(
                $"/api/connections/{connection.Id}/audit?environmentId={devEnv.Id}",
                Json
            )
        )!.Items.ToList();

        entries.Should().ContainSingle();
    }

    [Fact]
    public async Task CreateFlag_ProtectedEnvironmentInSelection_IsRejectedBeforeAnyWrite()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        var connection = await CreateConnectionWithEnvsAsync();
        var prodEnv = connection.Environments.Single(e => e.EnvironmentKey == "prod");
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/environments/{prodEnv.Id}/protection",
            new { isProtected = true }
        );

        await InviteAndAcceptMemberAsync("multi-member@test.com");
        Authenticate(await LoginAndGetTokenAsync("multi-member@test.com", MemberPassword));

        var resp = await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new
            {
                id = "blocked",
                labels = new[] { "dev", "prod" },
                isEnabled = false,
            }
        );

        resp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await GetStoredFlagAsync("blocked", "dev")).Should().BeNull();
        (await GetStoredFlagAsync("blocked", "prod")).Should().BeNull();
    }
}
