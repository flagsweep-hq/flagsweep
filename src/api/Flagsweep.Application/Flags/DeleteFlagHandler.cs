namespace Flagsweep.Application.Flags;

public record DeleteFlagCommand(int ConnectionId, string Id, string? Label) : IRequest<Result>;

public class DeleteFlagHandler(
    IFlagsweepDbContext db,
    IFlagStoreProviderFactory providerFactory,
    IUserContext userContext
) : IRequestHandler<DeleteFlagCommand, Result>
{
    public async Task<Result> HandleAsync(DeleteFlagCommand command, CancellationToken ct = default)
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

        var connection = await FlagQueries.GetConnectionAsync(db, command.ConnectionId, ct);
        if (connection is null)
            return FlagErrors.ConnectionNotFound();

        var provider = providerFactory.Create(connection);
        try
        {
            await provider.DeleteFlagAsync(command.Id, command.Label, ct);
        }
        catch (FlagLockedException)
        {
            return FlagErrors.Locked();
        }

        await FlagAudit.RecordAsync(
            db,
            command.ConnectionId,
            command.Label,
            userContext.UserId,
            [new FlagChange(command.Id, FlagChangeField.Deleted, null, null)],
            providerTimestamp: null,
            ct
        );
        return Result.Ok();
    }
}

public class DeleteFlagCommandValidator : AbstractValidator<DeleteFlagCommand>
{
    public DeleteFlagCommandValidator()
    {
        RuleFor(x => x.Id).ValidFlagId();
    }
}
