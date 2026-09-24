namespace Flagsweep.Application.Flags;

public record FlagDto(
    string Id,
    string? Label,
    bool IsEnabled,
    string? Description,
    string? DisplayName,
    DateTimeOffset? LastModified,
    bool IsPermanent = false,
    DateTimeOffset? ExpiresAt = null,
    bool? ModifiedExternally = null,
    bool IsLocked = false,
    string? OwnerId = null,
    string? OwnerEmail = null,
    bool OwnerIsDeleted = false
)
{
    public static FlagDto FromFlag(FeatureFlag flag) =>
        new(
            flag.Id,
            flag.Label,
            flag.IsEnabled,
            flag.Description,
            flag.DisplayName,
            flag.LastModified,
            flag.IsPermanent,
            flag.ExpiresAt,
            IsLocked: flag.IsLocked
        );
};
