using System.Text.Json.Nodes;
using Azure.Data.AppConfiguration;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class FeatureFilterTests : FunctionalTestBase
{
    public FeatureFilterTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private const string FilteredFlagJson = """
        {
          "id": "targeted-rollout",
          "enabled": true,
          "conditions": {
            "client_filters": [
              {
                "name": "Microsoft.Targeting",
                "parameters": { "Audience": { "DefaultRolloutPercentage": 50 } }
              },
              { "name": "Microsoft.TimeWindow", "parameters": { "Start": "2026-01-01T00:00:00Z" } }
            ]
          }
        }
        """;

    private async Task SeedFilteredFlagAsync()
    {
        var setting = new ConfigurationSetting(
            ".appconfig.featureflag/targeted-rollout",
            FilteredFlagJson,
            "dev"
        )
        {
            ContentType = "application/vnd.microsoft.appconfig.ff+json;charset=utf-8",
        };
        await StoreClient().SetConfigurationSettingAsync(setting);
    }

    private async Task<int> CreateConnectionWithDevEnvAsync()
    {
        var connection = await CreateConnectionAsync(
            "Filter App",
            [new { name = "Dev", environmentKey = "dev" }]
        );
        return connection.Id;
    }

    [Fact]
    public async Task Toggle_PreservesClientFilters()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();
        await SeedFilteredFlagAsync();

        var toggleResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/targeted-rollout?label=dev",
            new { enabled = false }
        );
        toggleResp.IsSuccessStatusCode.Should().BeTrue();

        var stored = await GetStoredFlagAsync("targeted-rollout", "dev");
        var json = JsonNode.Parse(stored!.Value)!.AsObject();
        json["enabled"]!.GetValue<bool>().Should().BeFalse();
        var filters = json["conditions"]!["client_filters"]!.AsArray();
        filters.Should().HaveCount(2);
        filters[0]!["name"]!.GetValue<string>().Should().Be("Microsoft.Targeting");
        filters[0]!["parameters"]!["Audience"]!["DefaultRolloutPercentage"]!
            .GetValue<int>()
            .Should()
            .Be(50);
    }
}
