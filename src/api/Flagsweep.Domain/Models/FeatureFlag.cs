namespace Flagsweep.Domain.Models;

public record FeatureFlag(
    string Id,
    string Key,
    string? Label,
    bool IsEnabled,
    string? Description,
    string? DisplayName,
    DateTimeOffset? LastModified,
    bool IsPermanent = false,
    DateTimeOffset? ExpiresAt = null,
    bool IsLocked = false
)
{
    public FeatureFlag Toggle() => this with { IsEnabled = !IsEnabled };

    public FeatureFlag WithUpdatedMetadata(string? displayName, string? description) =>
        this with
        {
            DisplayName = displayName ?? DisplayName,
            Description = description ?? Description,
        };
}
