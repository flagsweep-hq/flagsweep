using Flagsweep.Application.Flags;
using Microsoft.Extensions.DependencyInjection;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class AzureToggleTests : FunctionalTestBase
{
    public AzureToggleTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    [Fact]
    public async Task AzureToggle_WritesImmediately_RecordsAuditEntry()
    {
        await SetupAndAuthAsync();

        var connection = await CreateConnectionAsync(
            "Azure App",
            [new { name = "Dev", environmentKey = "dev" }]
        );
        var envId = connection.Environments[0].Id;

        await SeedFlagAsync(
            "toggle-me",
            isEnabled: false,
            label: "dev",
            displayName: "Toggle Test"
        );

        var toggleResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/toggle-me?label=dev",
            new { enabled = true }
        );

        toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var flagDto = await toggleResp.Content.ReadFromJsonAsync<FlagDto>(Json);
        flagDto!.IsEnabled.Should().BeTrue();

        var stored = await GetStoredFlagAsync("toggle-me", "dev");
        stored.Should().NotBeNull();
        stored!.IsEnabled.Should().BeTrue();

        using var scope = Fixture.Services.CreateScope();
        var dbContext =
            scope.ServiceProvider.GetRequiredService<Flagsweep.Infrastructure.Persistence.FlagsweepDbContext>();
        var audits = dbContext
            .AuditEntries.Where(d => d.ConnectionId == connection.Id && d.EnvironmentId == envId)
            .ToList();
        audits.Should().HaveCount(1);
    }
}
