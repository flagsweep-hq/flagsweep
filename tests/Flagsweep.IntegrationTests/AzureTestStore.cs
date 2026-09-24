using Azure;
using Azure.Data.AppConfiguration;

namespace Flagsweep.IntegrationTests;

public sealed class AzureTestStore : IAsyncLifetime
{
    private const string TestKeyPrefix = "flagsweep-test-";

    private static readonly TimeSpan StaleAfter = TimeSpan.FromHours(1);

    public string? ConnectionString { get; } =
        Environment.GetEnvironmentVariable(AzureConfiguredFactAttribute.ConnectionStringVariable);

    public string RunPrefix { get; } = $"{TestKeyPrefix}{Guid.NewGuid():N}-";

    public string UniqueId(string hint) => $"{RunPrefix}{hint}-{Guid.NewGuid():N}";

    public ConfigurationClient CreateClient() => new(ConnectionString);

    public Task InitializeAsync() =>
        SweepAsync(TestKeyPrefix, modifiedBefore: DateTimeOffset.UtcNow - StaleAfter);

    public Task DisposeAsync() => SweepAsync(RunPrefix, modifiedBefore: DateTimeOffset.MaxValue);

    private async Task SweepAsync(string prefix, DateTimeOffset modifiedBefore)
    {
        if (string.IsNullOrEmpty(ConnectionString))
            return;

        var client = CreateClient();
        string[] keyFilters =
        [
            FeatureFlagConfigurationSetting.KeyPrefix + prefix + "*",
            prefix + "*",
        ];
        foreach (var keyFilter in keyFilters)
        {
            var selector = new SettingSelector { KeyFilter = keyFilter, LabelFilter = "*" };
            await foreach (var setting in client.GetConfigurationSettingsAsync(selector))
            {
                if (setting.LastModified >= modifiedBefore)
                    continue;
                try
                {
                    await client.DeleteConfigurationSettingAsync(setting.Key, setting.Label);
                }
                catch (RequestFailedException) { }
            }
        }
    }
}
