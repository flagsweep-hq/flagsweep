namespace Flagsweep.Application.Flags;

public record SetFlagLockRequest(bool Locked);

public record SetFlagLockCommand(int ConnectionId, string Id, string? Label, bool Locked)
    : IRequest<Result>;

public class SetFlagLockHandler(
    IFlagsweepDbContext db,
    IFlagStoreProviderFactory providerFactory,
    IUserContext userContext
) : IRequestHandler<SetFlagLockCommand, Result>
{
    public async Task<Result> HandleAsync(
        SetFlagLockCommand command,
        CancellationToken ct = default
    )
    {
        var guard = await EnvironmentProtectionGuard.CheckAsync(
            db,
            userContext,
            command.ConnectionId,
            command.Label,
            ct
        );
        if (guard is not null)
            return guard;

        if (!userContext.IsAdmin)
        {
            var isOwner = await db.FlagOwners.AnyAsync(
                o =>
                    o.ConnectionId == command.ConnectionId
                    && o.FlagId == command.Id
                    && o.UserId == userContext.UserId,
                ct
            );
            if (!isOwner)
                return Result.Fail(
                    Error.Forbidden("Only an admin or the flag's owner can change its lock.")
                );
        }

        var connection = await FlagQueries.GetConnectionAsync(db, command.ConnectionId, ct);
        if (connection is null)
            return FlagErrors.ConnectionNotFound();

        var provider = providerFactory.Create(connection);
        var providerTimestamp = await provider.SetLockAsync(
            command.Id,
            command.Label,
            command.Locked,
            ct
        );

        await FlagAudit.RecordAsync(
            db,
            command.ConnectionId,
            command.Label,
            userContext.UserId,
            [
                new FlagChange(
                    command.Id,
                    FlagChangeField.Locked,
                    (!command.Locked).ToString().ToLower(),
                    command.Locked.ToString().ToLower()
                ),
            ],
            providerTimestamp,
            ct
        );
        return Result.Ok();
    }
}

public class SetFlagLockCommandValidator : AbstractValidator<SetFlagLockCommand>
{
    public SetFlagLockCommandValidator()
    {
        RuleFor(x => x.Id).ValidFlagId();
    }
}
