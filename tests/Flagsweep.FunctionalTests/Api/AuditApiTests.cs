using Flagsweep.Application.Audit;
using Flagsweep.Domain.Models;

namespace Flagsweep.FunctionalTests.Api;

public class AuditApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    private async Task<(int ConnectionId, int EnvId)> SetupConnectionAsync()
    {
        var connection = await CreateConnectionAsync(
            "Audit App",
            new[] { new { name = "Dev", environmentKey = "dev" } }
        );
        return (connection.Id, connection.Environments[0].Id);
    }

    [Fact]
    public async Task FlagWrites_AppearInAuditTrail_WithActor()
    {
        var (connectionId, envId) = await SetupConnectionAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "audited-flag",
                labels = new[] { "dev" },
                isEnabled = false,
            }
        );
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/audited-flag?label=dev",
            new { enabled = true }
        );

        var entries = (
            await Client.GetFromJsonAsync<PagedResult<AuditEntryDto>>(
                $"/api/connections/{connectionId}/audit?environmentId={envId}",
                Json
            )
        )!.Items.ToList();

        entries.Should().HaveCount(2);
        entries![0].Changes.Single().Field.Should().Be(FlagChangeField.Enabled);
        entries[0].TriggeredByEmail.Should().NotBeNullOrEmpty();
        entries[1].Changes.Single().Field.Should().Be(FlagChangeField.Created);
    }

    [Fact]
    public async Task AuditTrail_FiltersByEnvironment()
    {
        var (connectionId, envId) = await SetupConnectionAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "env-scoped",
                labels = new[] { "dev" },
                isEnabled = true,
            }
        );

        var other = (
            await Client.GetFromJsonAsync<PagedResult<AuditEntryDto>>(
                $"/api/connections/{connectionId}/audit?environmentId={envId + 999}",
                Json
            )
        )!.Items.ToList();
        other.Should().BeEmpty();
    }
}
