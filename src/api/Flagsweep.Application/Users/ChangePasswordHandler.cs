namespace Flagsweep.Application.Users;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword) : IRequest<Result>;

public class ChangePasswordHandler(
    UserManager<ApplicationUser> userManager,
    IUserContext userContext
) : IRequestHandler<ChangePasswordRequest, Result>
{
    public async Task<Result> HandleAsync(ChangePasswordRequest req, CancellationToken ct = default)
    {
        if (!userContext.IsAuthenticated || string.IsNullOrWhiteSpace(userContext.UserId))
            return UserErrors.NotAuthenticated();

        var user = await userManager.FindByIdAsync(userContext.UserId);
        if (user is null)
            return UserErrors.UnknownUser();

        var result = await userManager.ChangePasswordAsync(
            user,
            req.CurrentPassword,
            req.NewPassword
        );
        if (!result.Succeeded)
        {
            return result.Errors.Any(e => e.Code == "PasswordMismatch")
                ? UserErrors.CurrentPasswordIncorrect()
                : UserErrors.IdentityFailure(result);
        }

        return Result.Ok();
    }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator(Flagsweep.Application.Authentication.AuthOptions auth)
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword)
            .NotEmpty()
            .MinimumLength(auth.Password.RequiredLength)
            .WithMessage($"Password must be at least {auth.Password.RequiredLength} characters.");
    }
}
