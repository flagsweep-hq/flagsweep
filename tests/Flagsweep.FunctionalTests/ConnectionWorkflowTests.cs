using Flagsweep.Application.Connections;
using Flagsweep.Application.Flags;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class ConnectionWorkflowTests : FunctionalTestBase
{
    public ConnectionWorkflowTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    [Fact]
    public async Task FullConnectionLifecycle_Connection_Environments_Flags()
    {
        await SetupAndAuthAsync();

        await SeedFlagAsync("dark-mode", isEnabled: true, displayName: "Dark Mode");
        await SeedFlagAsync("beta-feature", isEnabled: false, displayName: "Beta Feature");
        await SeedFlagAsync("dark-mode", isEnabled: true, label: "Development");
        await SeedFlagAsync("dark-mode", isEnabled: false, label: "Production");

        var connection = await CreateConnectionAsync(
            "Feature Flags App",
            [
                new { name = "Dev", environmentKey = "Development" },
                new { name = "Prod", environmentKey = "Production" },
            ]
        );
        connection.Name.Should().Be("Feature Flags App");
        connection.Environments.Should().HaveCount(2);
        connection.Environments[0].Name.Should().Be("Dev");
        connection.Environments[1].Name.Should().Be("Prod");

        var flagsResp = await Client.GetAsync($"/api/connections/{connection.Id}/flags");
        flagsResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var flags = (
            await flagsResp.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        flags.Should().HaveCount(2);

        var labelsResp = await Client.GetAsync($"/api/connections/{connection.Id}/labels");
        labelsResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var labels = await labelsResp.Content.ReadFromJsonAsync<List<string>>(Json);
        labels.Should().Contain("Development").And.Contain("Production");

        var createFlagResp = await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new
            {
                id = "new-feature",
                isEnabled = true,
                description = "A new flag",
            }
        );
        createFlagResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var created = await GetStoredFlagAsync("new-feature");
        created.Should().NotBeNull();
        created!.IsEnabled.Should().BeTrue();

        var toggleResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/dark-mode",
            new { enabled = false }
        );
        toggleResp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await GetStoredFlagAsync("dark-mode"))!.IsEnabled.Should().BeFalse();

        var metaResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/dark-mode",
            new { displayName = "Dark Theme", description = "Updated desc" }
        );
        metaResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await GetStoredFlagAsync("dark-mode");
        updated!.DisplayName.Should().Be("Dark Theme");
        updated.Description.Should().Be("Updated desc");

        var deleteResp = await Client.DeleteAsync(
            $"/api/connections/{connection.Id}/flags/beta-feature"
        );
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await GetStoredFlagAsync("beta-feature")).Should().BeNull();

        var updateResp = await Client.PutAsJsonAsync(
            $"/api/connections/{connection.Id}",
            new { name = "Renamed Connection" }
        );
        updateResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var updatedConnection = await Client.GetFromJsonAsync<ConnectionDto>(
            $"/api/connections/{connection.Id}",
            Json
        );
        updatedConnection!.Name.Should().Be("Renamed Connection");
    }

    [Fact]
    public async Task EnvironmentReorder()
    {
        await SetupAndAuthAsync();

        var connection = await CreateConnectionAsync(
            "Reorder Test",
            [new { name = "A" }, new { name = "B" }, new { name = "C" }]
        );

        var ids = connection.Environments.Select(e => e.Id).Reverse().ToList();
        var reorderResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/environments",
            new { environmentIds = ids }
        );
        reorderResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var fetched = await Client.GetFromJsonAsync<ConnectionDto>(
            $"/api/connections/{connection.Id}",
            Json
        );
        fetched!.Environments[0].Name.Should().Be("C");
        fetched.Environments[2].Name.Should().Be("A");
    }
}
