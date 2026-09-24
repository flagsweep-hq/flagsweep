namespace Flagsweep.Application.Users;

public record InviteTokenInfo(string Email, string Role);

public record ValidateInviteTokenQuery(string Token) : IRequest<Result<InviteTokenInfo>>;

public class ValidateInviteTokenHandler(IFlagsweepDbContext db, TimeProvider timeProvider)
    : IRequestHandler<ValidateInviteTokenQuery, Result<InviteTokenInfo>>
{
    public async Task<Result<InviteTokenInfo>> HandleAsync(
        ValidateInviteTokenQuery request,
        CancellationToken ct = default
    )
    {
        var utcNow = timeProvider.GetUtcNow().UtcDateTime;

        var invitation = await db.Invitations.FirstOrDefaultAsync(
            i => i.Token == request.Token && i.ExpiresAt > utcNow,
            ct
        );

        if (invitation is null)
            return UserErrors.InvalidOrExpiredInvitation();

        return new InviteTokenInfo(invitation.Email, invitation.Role);
    }
}
