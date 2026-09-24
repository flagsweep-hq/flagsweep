namespace Flagsweep.Application.Users;

public record RegisterRequest(string Email, string Password) : IRequest<Result>;

public class SetupHandler(UserManager<ApplicationUser> userManager, IFlagsweepDbContext db)
    : IRequestHandler<RegisterRequest, Result>
{
    public async Task<Result> HandleAsync(RegisterRequest req, CancellationToken ct = default)
    {
        if (await db.Users.AnyAsync(u => u.Role == Roles.Admin, ct))
            return UserErrors.SetupAlreadyCompleted();

        var user = new ApplicationUser
        {
            UserName = req.Email.ToLowerInvariant(),
            Email = req.Email.ToLowerInvariant(),
            Role = Roles.Admin,
        };

        var result = await userManager.CreateAsync(user, req.Password);
        if (!result.Succeeded)
            return UserErrors.IdentityFailure(result);

        return Result.Ok();
    }
}

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator(Flagsweep.Application.Authentication.AuthOptions auth)
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(auth.Password.RequiredLength)
            .WithMessage($"Password must be at least {auth.Password.RequiredLength} characters.");
    }
}
