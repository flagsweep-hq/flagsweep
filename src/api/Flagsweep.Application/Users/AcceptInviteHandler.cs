namespace Flagsweep.Application.Users;

public record AcceptInviteRequest(string Token, string Password) : IRequest<Result>;

public class AcceptInviteHandler(
    UserManager<ApplicationUser> userManager,
    IFlagsweepDbContext db,
    TimeProvider timeProvider
) : IRequestHandler<AcceptInviteRequest, Result>
{
    public async Task<Result> HandleAsync(AcceptInviteRequest req, CancellationToken ct = default)
    {
        var utcNow = timeProvider.GetUtcNow().UtcDateTime;

        var invitation = await db.Invitations.FirstOrDefaultAsync(
            i => i.Token == req.Token && i.ExpiresAt > utcNow,
            ct
        );

        if (invitation is null)
            return UserErrors.InvalidOrExpiredInvitation();

        var email = invitation.Email.ToLowerInvariant();

        var deletedUser = await db
            .Users.IgnoreQueryFilters()
            .FirstOrDefaultAsync(
                u => u.IsDeleted && u.NormalizedEmail == email.ToUpperInvariant(),
                ct
            );

        if (deletedUser is not null)
        {
            deletedUser.Restore();
            deletedUser.Role = invitation.Role;

            var resetToken = await userManager.GeneratePasswordResetTokenAsync(deletedUser);
            var reset = await userManager.ResetPasswordAsync(deletedUser, resetToken, req.Password);
            if (!reset.Succeeded)
                return UserErrors.IdentityFailure(reset);
        }
        else
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                Role = invitation.Role,
            };

            var result = await userManager.CreateAsync(user, req.Password);
            if (!result.Succeeded)
                return UserErrors.IdentityFailure(result);
        }

        db.Invitations.Remove(invitation);
        await db.SaveChangesAsync(ct);

        return Result.Ok();
    }
}

public class AcceptInviteRequestValidator : AbstractValidator<AcceptInviteRequest>
{
    public AcceptInviteRequestValidator(Flagsweep.Application.Authentication.AuthOptions auth)
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(auth.Password.RequiredLength)
            .WithMessage($"Password must be at least {auth.Password.RequiredLength} characters.");
    }
}
