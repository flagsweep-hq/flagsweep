namespace Flagsweep.Application.Flags;

public record CreateFlagRequest(
    string Id,
    IReadOnlyList<string?>? Labels = null,
    string? Description = null,
    string? DisplayName = null,
    bool IsEnabled = false,
    bool IsPermanent = false,
    DateTimeOffset? ExpiresAt = null,
    string? OwnerId = null
);

public record CreateFlagCommand(int ConnectionId, CreateFlagRequest Request) : IRequest<Result>;

public class CreateFlagHandler(
    IFlagsweepDbContext db,
    IFlagStoreProviderFactory providerFactory,
    IUserContext userContext,
    TimeProvider timeProvider
) : IRequestHandler<CreateFlagCommand, Result>
{
    public async Task<Result> HandleAsync(CreateFlagCommand command, CancellationToken ct = default)
    {
        var connectionId = command.ConnectionId;
        var req = command.Request;
        var labels = NormalizeLabels(req.Labels);

        foreach (var label in labels)
        {
            var guard = await EnvironmentProtectionGuard.CheckAsync(
                db,
                userContext,
                connectionId,
                label,
                ct
            );
            if (guard is not null)
                return guard;
        }

        var connection = await FlagQueries.GetConnectionAsync(db, connectionId, ct);
        if (connection is null)
            return FlagErrors.ConnectionNotFound();

        if (req.OwnerId is not null)
        {
            var userExists = await db.Users.AnyAsync(u => u.Id == req.OwnerId, ct);
            if (!userExists)
                return Error.NotFound("Owner user not found.");
        }

        var flagId = req.Id.Trim();
        DateTimeOffset? expiresAt = req.IsPermanent
            ? null
            : req.ExpiresAt
                ?? timeProvider.GetUtcNow().AddDays(FlagsweepDefaults.DefaultFlagLifetimeDays);

        var provider = providerFactory.Create(connection);

        foreach (var label in labels)
        {
            var flag = new FeatureFlag(
                Id: flagId,
                Key: string.Empty,
                Label: label,
                IsEnabled: req.IsEnabled,
                Description: req.Description,
                DisplayName: req.DisplayName ?? flagId,
                LastModified: null,
                IsPermanent: req.IsPermanent,
                ExpiresAt: expiresAt
            );

            DateTimeOffset? providerTimestamp;
            try
            {
                providerTimestamp = await provider.UpsertFlagAsync(flag, ct);
            }
            catch (FlagLockedException)
            {
                return FlagErrors.Locked();
            }

            await FlagAudit.RecordAsync(
                db,
                connectionId,
                label,
                userContext.UserId,
                [
                    new FlagChange(
                        flagId,
                        FlagChangeField.Created,
                        null,
                        flag.IsEnabled.ToString().ToLower()
                    ),
                ],
                providerTimestamp,
                ct
            );
        }

        if (req.OwnerId is not null)
        {
            var owner = await db.FlagOwners.FirstOrDefaultAsync(
                o => o.ConnectionId == connectionId && o.FlagId == flagId,
                ct
            );
            if (owner is null)
                db.FlagOwners.Add(new FlagOwner(connectionId, flagId, req.OwnerId));
            else
                owner.Reassign(req.OwnerId);
            await db.SaveChangesAsync(ct);
        }

        return Result.Ok();
    }

    private static IReadOnlyList<string?> NormalizeLabels(IReadOnlyList<string?>? labels)
    {
        if (labels is null || labels.Count == 0)
            return [null];

        return labels
            .Select(l => string.IsNullOrWhiteSpace(l) ? null : l.Trim())
            .Distinct()
            .ToList();
    }
}

public class CreateFlagCommandValidator : AbstractValidator<CreateFlagCommand>
{
    public CreateFlagCommandValidator()
    {
        RuleFor(x => x.Request.Id).ValidFlagId();
    }
}
