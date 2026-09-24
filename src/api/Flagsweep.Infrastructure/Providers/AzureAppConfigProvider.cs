using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Nodes;
using Azure.Data.AppConfiguration;
using Flagsweep.Domain;

namespace Flagsweep.Infrastructure.Providers;

public class AzureAppConfigProvider(ConfigurationClient client, string? storeName = null)
    : IFlagStoreProvider
{
    public string? StoreName { get; } = storeName;

    private const string NullLabel = "\0";

    private const string FeatureFlagContentType =
        "application/vnd.microsoft.appconfig.ff+json;charset=utf-8";

    public IAsyncEnumerable<FeatureFlag> ListFlagsAsync(
        string? label,
        CancellationToken ct = default
    ) => ListFlagsByLabelFilterAsync(label ?? NullLabel, ct);

    public IAsyncEnumerable<FeatureFlag> ListFlagsAcrossLabelsAsync(
        CancellationToken ct = default
    ) => ListFlagsByLabelFilterAsync(SettingSelector.Any, ct);

    private async IAsyncEnumerable<FeatureFlag> ListFlagsByLabelFilterAsync(
        string labelFilter,
        [EnumeratorCancellation] CancellationToken ct
    )
    {
        var selector = new SettingSelector
        {
            KeyFilter = FeatureFlagConfigurationSetting.KeyPrefix + "*",
            LabelFilter = labelFilter,
        };

        await foreach (var setting in client.GetConfigurationSettingsAsync(selector, ct))
        {
            if (setting is FeatureFlagConfigurationSetting flag)
                yield return MapToFlag(flag);
        }
    }

    public async IAsyncEnumerable<string> ListLabelsAsync(
        [EnumeratorCancellation] CancellationToken ct = default
    )
    {
        var labels = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        try
        {
            await foreach (var label in client.GetLabelsAsync(new SettingLabelSelector(), ct))
            {
                if (!string.IsNullOrEmpty(label.Name))
                    labels.Add(label.Name);
            }
        }
        catch (NotSupportedException)
        {
            var selector = new SettingSelector
            {
                KeyFilter = FeatureFlagConfigurationSetting.KeyPrefix + "*",
                LabelFilter = SettingSelector.Any,
            };

            await foreach (var setting in client.GetConfigurationSettingsAsync(selector, ct))
            {
                if (!string.IsNullOrEmpty(setting.Label))
                    labels.Add(setting.Label);
            }
        }

        foreach (var label in labels)
            yield return label;
    }

    public async Task<DateTimeOffset?> UpsertFlagAsync(
        FeatureFlag flag,
        CancellationToken ct = default
    )
    {
        var key = FeatureFlagConfigurationSetting.KeyPrefix + flag.Id;

        var json = ParseFlagJson(await GetRawValueAsync(key, flag.Label, ct)) ?? new JsonObject();

        json["id"] = flag.Id;
        json["enabled"] = flag.IsEnabled;
        SetOrRemove(json, "description", flag.Description);
        SetOrRemove(json, "display_name", flag.DisplayName);
        json["conditions"] ??= new JsonObject { ["client_filters"] = new JsonArray() };

        var setting = new ConfigurationSetting(key, json.ToJsonString(), flag.Label)
        {
            ContentType = FeatureFlagContentType,
        };

        if (flag.IsPermanent)
            setting.Tags[FlagsweepDefaults.PermanentTag] = "true";

        if (flag.ExpiresAt is not null)
            setting.Tags[FlagsweepDefaults.ExpiresAtTag] = flag.ExpiresAt.Value.ToString("O");

        try
        {
            var response = await client.SetConfigurationSettingAsync(
                setting,
                cancellationToken: ct
            );
            return response.Value.LastModified;
        }
        catch (Azure.RequestFailedException ex) when (ex.Status is 409 or 423)
        {
            throw new FlagLockedException(flag.Id, ex);
        }
    }

    public async Task DeleteFlagAsync(string flagId, string? label, CancellationToken ct = default)
    {
        var key = FeatureFlagConfigurationSetting.KeyPrefix + flagId;
        try
        {
            await client.DeleteConfigurationSettingAsync(key, label, cancellationToken: ct);
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404) { }
        catch (Azure.RequestFailedException ex) when (ex.Status is 409 or 423)
        {
            throw new FlagLockedException(flagId, ex);
        }
    }

    public async Task<DateTimeOffset?> SetLockAsync(
        string flagId,
        string? label,
        bool locked,
        CancellationToken ct = default
    )
    {
        var key = FeatureFlagConfigurationSetting.KeyPrefix + flagId;
        var response = await client.SetReadOnlyAsync(key, label, locked, ct);
        return response.Value.LastModified;
    }

    private static FeatureFlag MapToFlag(FeatureFlagConfigurationSetting setting)
    {
        return new(
            Id: setting.FeatureId,
            Key: setting.Key,
            Label: setting.Label,
            IsEnabled: setting.IsEnabled,
            Description: setting.Description,
            DisplayName: setting.DisplayName,
            LastModified: setting.LastModified,
            IsPermanent: setting.Tags.ContainsKey(FlagsweepDefaults.PermanentTag),
            IsLocked: setting.IsReadOnly ?? false,
            ExpiresAt: setting.Tags.TryGetValue(FlagsweepDefaults.ExpiresAtTag, out var exp)
            && DateTimeOffset.TryParse(exp, out var parsedExp)
                ? parsedExp
                : null
        );
    }

    private async Task<string?> GetRawValueAsync(string key, string? label, CancellationToken ct)
    {
        try
        {
            var response = await client.GetConfigurationSettingAsync(key, label, ct);
            return response.Value.Value;
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    private static JsonObject? ParseFlagJson(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        try
        {
            return JsonNode.Parse(raw) as JsonObject;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static void SetOrRemove(JsonObject json, string property, string? value)
    {
        if (value is null)
            json.Remove(property);
        else
            json[property] = value;
    }
}
