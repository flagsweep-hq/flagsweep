using Azure;
using Azure.Data.AppConfiguration;
using Flagsweep.Domain.Models;
using Flagsweep.Infrastructure.Providers;

namespace Flagsweep.IntegrationTests;

[Trait("Category", "External")]
public class AzureAppConfigProviderTests(AzureTestStore store) : IClassFixture<AzureTestStore>
{
    private AzureAppConfigProvider CreateProvider() =>
        new(new ConfigurationClient(store.ConnectionString), storeName: null);

    private static FeatureFlag NewFlag(
        string id,
        string? label = null,
        bool isEnabled = false,
        string? description = null,
        string? displayName = null
    ) => new(id, string.Empty, label, isEnabled, description, displayName, null);

    private async Task<FeatureFlag?> FindFlagAsync(
        AzureAppConfigProvider provider,
        string id,
        string? label = null
    )
    {
        await foreach (var flag in provider.ListFlagsAsync(label))
        {
            if (flag.Id == id)
                return flag;
        }
        return null;
    }

    [AzureConfiguredFact]
    public async Task UpsertAndToggle_RoundTrip()
    {
        var provider = CreateProvider();
        var testId = store.UniqueId("toggle");

        await provider.UpsertFlagAsync(
            NewFlag(
                testId,
                isEnabled: false,
                description: "Integration test flag",
                displayName: "Test Flag"
            )
        );

        var found = await FindFlagAsync(provider, testId);
        found.Should().NotBeNull();
        found!.IsEnabled.Should().BeFalse();

        await provider.UpsertFlagAsync(found.Toggle());

        var toggled = await FindFlagAsync(provider, testId);
        toggled.Should().NotBeNull();
        toggled!.IsEnabled.Should().BeTrue();
    }

    [AzureConfiguredFact]
    public async Task Upsert_PersistsMetadata()
    {
        var provider = CreateProvider();
        var testId = store.UniqueId("meta");

        await provider.UpsertFlagAsync(
            NewFlag(
                testId,
                isEnabled: true,
                description: "A descriptive description",
                displayName: "Display Name"
            )
        );

        var found = await FindFlagAsync(provider, testId);
        found.Should().NotBeNull();
        found!.Description.Should().Be("A descriptive description");
        found.DisplayName.Should().Be("Display Name");
        found.Key.Should().Be(FeatureFlagConfigurationSetting.KeyPrefix + testId);
        found.LastModified.Should().NotBeNull("the service stamps last_modified on write");
    }

    [AzureConfiguredFact]
    public async Task ListFlags_NullLabel_ExcludesLabeledFlags()
    {
        var provider = CreateProvider();
        var label = store.UniqueId("env");
        var unlabeledId = store.UniqueId("nolabel");
        var labeledId = store.UniqueId("labeled");

        await provider.UpsertFlagAsync(NewFlag(unlabeledId));
        await provider.UpsertFlagAsync(NewFlag(labeledId, label));

        (await FindFlagAsync(provider, unlabeledId))
            .Should()
            .NotBeNull("the \\0 null-label sentinel must match unlabeled flags");
        (await FindFlagAsync(provider, labeledId))
            .Should()
            .BeNull("the \\0 null-label sentinel must exclude labeled flags");
    }

    [AzureConfiguredFact]
    public async Task ListFlags_ByLabel_ReturnsOnlyThatLabel()
    {
        var provider = CreateProvider();
        var label = store.UniqueId("env");
        var unlabeledId = store.UniqueId("nolabel");
        var labeledId = store.UniqueId("labeled");

        await provider.UpsertFlagAsync(NewFlag(unlabeledId));
        await provider.UpsertFlagAsync(NewFlag(labeledId, label, isEnabled: true));

        var found = await FindFlagAsync(provider, labeledId, label);
        found.Should().NotBeNull();
        found!.Label.Should().Be(label);
        (await FindFlagAsync(provider, unlabeledId, label))
            .Should()
            .BeNull("a label filter must not match unlabeled flags");
    }

    [AzureConfiguredFact]
    public async Task ListLabels_IncludesLabelOfCreatedFlag()
    {
        var provider = CreateProvider();
        var label = store.UniqueId("env");
        var flagId = store.UniqueId("labels");

        await provider.UpsertFlagAsync(NewFlag(flagId, label));

        var labels = new List<string>();
        await foreach (var l in provider.ListLabelsAsync())
            labels.Add(l);

        labels.Should().Contain(label);
    }

    [AzureConfiguredFact]
    public async Task Delete_RemovesFlagFromListing()
    {
        var provider = CreateProvider();
        var testId = store.UniqueId("del");

        await provider.UpsertFlagAsync(NewFlag(testId, isEnabled: true));
        await provider.DeleteFlagAsync(testId, null);

        (await FindFlagAsync(provider, testId)).Should().BeNull();
    }

    [AzureConfiguredFact]
    public async Task Delete_NonExistentFlag_DoesNotThrow()
    {
        var provider = CreateProvider();

        var act = () => provider.DeleteFlagAsync(store.UniqueId("ghost"), null);
        await act.Should().NotThrowAsync();
    }

    [AzureConfiguredFact]
    public async Task FlagIdWithDots_RoundTrips()
    {
        var provider = CreateProvider();
        var testId = store.UniqueId("dotted.flag.id");

        await provider.UpsertFlagAsync(NewFlag(testId, isEnabled: true));

        var found = await FindFlagAsync(provider, testId);
        found.Should().NotBeNull();
        found!.Id.Should().Be(testId);
    }

    [AzureConfiguredFact]
    public async Task StaleEtagWrite_IsRejectedWith412()
    {
        var client = store.CreateClient();
        var key = store.UniqueId("etag");

        var original = (
            await client.SetConfigurationSettingAsync(new ConfigurationSetting(key, "v1"))
        ).Value;

        await client.SetConfigurationSettingAsync(new ConfigurationSetting(key, "v2"));

        original.Value = "v3";
        var act = () => client.SetConfigurationSettingAsync(original, onlyIfUnchanged: true);
        (await act.Should().ThrowAsync<RequestFailedException>()).Which.Status.Should().Be(412);
    }
}
