namespace Flagsweep.Application.Users;

public record InviteRequest(string Email, string? Role);

public record InviteResponse(
    int Id,
    string Email,
    string Role,
    string Token,
    string InviteUrl,
    DateTime ExpiresAt
);

public record CreateInvitationCommand(InviteRequest Request, string BaseUrl)
    : IRequest<Result<InviteResponse>>;

public class CreateInvitationHandler(
    UserManager<ApplicationUser> userManager,
    IFlagsweepDbContext db,
    TimeProvider timeProvider
) : IRequestHandler<CreateInvitationCommand, Result<InviteResponse>>
{
    public async Task<Result<InviteResponse>> HandleAsync(
        CreateInvitationCommand command,
        CancellationToken ct = default
    )
    {
        var email = command.Request.Email.Trim().ToLowerInvariant();

        var existingUser = await userManager.FindByEmailAsync(email);
        if (existingUser is not null)
            return UserErrors.EmailTaken();

        var utcNow = timeProvider.GetUtcNow().UtcDateTime;

        var pendingInvite = await db.Invitations.AnyAsync(
            i => i.Email == email && i.ExpiresAt > utcNow,
            ct
        );
        if (pendingInvite)
            return UserErrors.ActiveInvitationExists();

        var role =
            command.Request.Role?.Equals(Roles.Admin, StringComparison.OrdinalIgnoreCase) == true
                ? Roles.Admin
                : Roles.Member;

        var invitation = Invitation.Create(email, role, utcNow);

        db.Invitations.Add(invitation);
        await db.SaveChangesAsync(ct);

        var inviteUrl = $"{command.BaseUrl}/invite/{invitation.Token}";

        return new InviteResponse(
            invitation.Id,
            invitation.Email,
            invitation.Role,
            invitation.Token,
            inviteUrl,
            invitation.ExpiresAt
        );
    }
}

public class CreateInvitationCommandValidator : AbstractValidator<CreateInvitationCommand>
{
    public CreateInvitationCommandValidator()
    {
        RuleFor(x => x.Request.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Request.Role)
            .Must(r => r is null || Roles.IsValid(r))
            .WithMessage("Role must be 'Admin' or 'Member'.");
    }
}
