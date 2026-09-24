namespace Flagsweep.Application.Flags;

public record SetFlagOwnerRequest(string? UserId);

public record SetFlagOwnerCommand(int ConnectionId, string Id, string? UserId) : IRequest<Result>;

public class SetFlagOwnerHandler(IFlagsweepDbContext db)
    : IRequestHandler<SetFlagOwnerCommand, Result>
{
    public async Task<Result> HandleAsync(
        SetFlagOwnerCommand command,
        CancellationToken ct = default
    )
    {
        var connectionExists = await db.Connections.AnyAsync(p => p.Id == command.ConnectionId, ct);
        if (!connectionExists)
            return FlagErrors.ConnectionNotFound();

        var flagId = command.Id.Trim();
        var owner = await db.FlagOwners.FirstOrDefaultAsync(
            o => o.ConnectionId == command.ConnectionId && o.FlagId == flagId,
            ct
        );

        if (command.UserId is null)
        {
            if (owner is not null)
                db.FlagOwners.Remove(owner);
        }
        else
        {
            var userExists = await db.Users.AnyAsync(u => u.Id == command.UserId, ct);
            if (!userExists)
                return Error.NotFound("User not found.");

            if (owner is null)
                db.FlagOwners.Add(new FlagOwner(command.ConnectionId, flagId, command.UserId));
            else
                owner.Reassign(command.UserId);
        }

        await db.SaveChangesAsync(ct);
        return Result.Ok();
    }
}

public class SetFlagOwnerCommandValidator : AbstractValidator<SetFlagOwnerCommand>
{
    public SetFlagOwnerCommandValidator()
    {
        RuleFor(x => x.Id).ValidFlagId();
    }
}
