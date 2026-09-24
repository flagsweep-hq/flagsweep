namespace Flagsweep.Application.Users;

public record ResetPasswordRequest(string Email, string Token, string NewPassword)
    : IRequest<Result>;

public class ResetPasswordHandler(UserManager<ApplicationUser> userManager)
    : IRequestHandler<ResetPasswordRequest, Result>
{
    public async Task<Result> HandleAsync(ResetPasswordRequest req, CancellationToken ct = default)
    {
        var user = await userManager.FindByEmailAsync(req.Email.Trim().ToLowerInvariant());
        if (user is null)
            return UserErrors.InvalidOrExpiredResetToken();

        var result = await userManager.ResetPasswordAsync(user, req.Token, req.NewPassword);
        if (!result.Succeeded)
        {
            return result.Errors.Any(e => e.Code == "InvalidToken")
                ? UserErrors.InvalidOrExpiredResetToken()
                : UserErrors.IdentityFailure(result);
        }

        return Result.Ok();
    }
}

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator(Flagsweep.Application.Authentication.AuthOptions auth)
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(auth.Password.RequiredLength)
            .WithMessage($"Password must be at least {auth.Password.RequiredLength} characters.");
    }
}
