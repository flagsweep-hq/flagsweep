using Flagsweep.Application.Flags;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class DriftDetectionTests : FunctionalTestBase
{
    public DriftDetectionTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private async Task<int> CreateConnectionWithDevEnvAsync()
    {
        var connection = await CreateConnectionAsync(
            "Drift App",
            [new { name = "Dev", environmentKey = "dev" }]
        );
        return connection.Id;
    }

    private async Task<FlagDto> GetFlagAsync(int connectionId, string id)
    {
        var resp = (
            await Client.GetFromJsonAsync<PagedResult<FlagDto>>(
                $"/api/connections/{connectionId}/flags?label=dev",
                Json
            )
        )!.Items.ToList();
        return resp!.Single(f => f.Id == id);
    }

    [Fact]
    public async Task Flag_WrittenOnlyByFlagsweep_HasNoDrift()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "clean-flag",
                labels = new[] { "dev" },
                isEnabled = true,
            }
        );

        var flag = await GetFlagAsync(connectionId, "clean-flag");
        flag.ModifiedExternally.Should().BeFalse();
    }

    [Fact]
    public async Task Flag_ChangedInStoreAfterFlagsweepWrite_ReportsDrift()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "drifted-flag",
                labels = new[] { "dev" },
                isEnabled = false,
            }
        );

        var stored = await GetStoredFlagAsync("drifted-flag", "dev");
        stored!.IsEnabled = true;
        await StoreClient().SetConfigurationSettingAsync(stored);

        var flag = await GetFlagAsync(connectionId, "drifted-flag");
        flag.ModifiedExternally.Should().BeTrue();

        await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/drifted-flag?label=dev",
            new { enabled = false }
        );
        flag = await GetFlagAsync(connectionId, "drifted-flag");
        flag.ModifiedExternally.Should().BeFalse();
    }

    [Fact]
    public async Task Flag_NeverWrittenByFlagsweep_HasUnknownDrift()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        await SeedFlagAsync("foreign-flag", isEnabled: true, label: "dev");

        var flag = await GetFlagAsync(connectionId, "foreign-flag");
        flag.ModifiedExternally.Should().BeNull();
    }

    [Fact]
    public async Task MetadataEdit_ThroughFlagsweep_DoesNotReportDrift()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "meta-flag",
                labels = new[] { "dev" },
                isEnabled = true,
            }
        );
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/meta-flag?label=dev",
            new { description = "updated through the app" }
        );

        var flag = await GetFlagAsync(connectionId, "meta-flag");
        flag.ModifiedExternally.Should().BeFalse();
    }
}
