namespace Flagsweep.Application.Flags;

public record UpdateFlagRequest(
    bool? Enabled = null,
    string? DisplayName = null,
    string? Description = null,
    bool? IsPermanent = null,
    DateTimeOffset? ExpiresAt = null,
    bool ClearExpiry = false
);

public record UpdateFlagCommand(
    int ConnectionId,
    string Id,
    string? Label,
    UpdateFlagRequest Request
) : IRequest<Result<FlagDto>>;

public class UpdateFlagHandler(
    IFlagsweepDbContext db,
    IFlagStoreProviderFactory providerFactory,
    IUserContext userContext
) : IRequestHandler<UpdateFlagCommand, Result<FlagDto>>
{
    public async Task<Result<FlagDto>> HandleAsync(
        UpdateFlagCommand command,
        CancellationToken ct = default
    )
    {
        var id = command.Id;
        var label = command.Label;
        var req = command.Request;

        var guard = await EnvironmentProtectionGuard.CheckAsync(
            db,
            userContext,
            command.ConnectionId,
            label,
            ct
        );
        if (guard is not null)
            return guard.Error!;

        var triggeredById = userContext.UserId;
        var connection = await FlagQueries.GetConnectionAsync(db, command.ConnectionId, ct);
        if (connection is null)
            return FlagErrors.ConnectionNotFound();

        var provider = providerFactory.Create(connection);

        var found = await FindFlagAsync(provider, id, label, ct);
        if (found is null)
            return FlagErrors.NotFound(id, label);

        var updated = found;

        if (req.DisplayName is not null || req.Description is not null)
            updated = updated.WithUpdatedMetadata(
                req.DisplayName ?? updated.DisplayName,
                req.Description ?? updated.Description
            );

        if (req.IsPermanent is not null)
            updated = updated with { IsPermanent = req.IsPermanent.Value };
        if (req.ExpiresAt is not null)
            updated = updated with { ExpiresAt = req.ExpiresAt };
        else if (req.ClearExpiry)
            updated = updated with { ExpiresAt = null };

        var toggled = req.Enabled is not null && req.Enabled.Value != found.IsEnabled;
        if (toggled)
            updated = updated.Toggle();

        var changes = DiffChanges(found, updated);
        if (changes.Count == 0)
            return FlagDto.FromFlag(found);

        DateTimeOffset? providerTimestamp;
        try
        {
            providerTimestamp = await provider.UpsertFlagAsync(updated, ct);
        }
        catch (FlagLockedException)
        {
            return FlagErrors.Locked();
        }

        await FlagAudit.RecordAsync(
            db,
            command.ConnectionId,
            label,
            triggeredById,
            changes,
            providerTimestamp,
            ct
        );

        return FlagDto.FromFlag(updated);
    }

    private static List<FlagChange> DiffChanges(FeatureFlag before, FeatureFlag after)
    {
        var changes = new List<FlagChange>();
        void Add(FlagChangeField field, string? from, string? to) =>
            changes.Add(new FlagChange(after.Id, field, from, to));

        if (after.IsEnabled != before.IsEnabled)
            Add(
                FlagChangeField.Enabled,
                before.IsEnabled.ToString().ToLower(),
                after.IsEnabled.ToString().ToLower()
            );
        if (after.DisplayName != before.DisplayName)
            Add(FlagChangeField.DisplayName, before.DisplayName, after.DisplayName);
        if (after.Description != before.Description)
            Add(FlagChangeField.Description, before.Description, after.Description);
        if (after.IsPermanent != before.IsPermanent)
            Add(
                FlagChangeField.IsPermanent,
                before.IsPermanent.ToString().ToLower(),
                after.IsPermanent.ToString().ToLower()
            );
        if (after.ExpiresAt != before.ExpiresAt)
            Add(
                FlagChangeField.ExpiresAt,
                before.ExpiresAt?.ToString("O"),
                after.ExpiresAt?.ToString("O")
            );
        return changes;
    }

    private static async Task<FeatureFlag?> FindFlagAsync(
        IFlagStoreProvider provider,
        string id,
        string? label,
        CancellationToken ct
    )
    {
        await foreach (var flag in provider.ListFlagsAsync(label, ct))
        {
            if (flag.Id == id)
                return flag;
        }
        return null;
    }
}

public class UpdateFlagCommandValidator : AbstractValidator<UpdateFlagCommand>
{
    public UpdateFlagCommandValidator()
    {
        RuleFor(x => x.Id).ValidFlagId();
        RuleFor(x => x.Request.DisplayName)
            .MaximumLength(200)
            .When(x => x.Request.DisplayName is not null);
        RuleFor(x => x.Request.Description)
            .MaximumLength(1000)
            .When(x => x.Request.Description is not null);
    }
}
