namespace Flagsweep.Application.Users;

public record RevokeInvitationCommand(int Id) : IRequest<Result>;

public class RevokeInvitationHandler(IFlagsweepDbContext db)
    : IRequestHandler<RevokeInvitationCommand, Result>
{
    public async Task<Result> HandleAsync(
        RevokeInvitationCommand command,
        CancellationToken ct = default
    )
    {
        var invitation = await db.Invitations.FindAsync([command.Id], ct);
        if (invitation is null)
            return UserErrors.InvitationNotFound();

        db.Invitations.Remove(invitation);
        await db.SaveChangesAsync(ct);
        return Result.Ok();
    }
}
