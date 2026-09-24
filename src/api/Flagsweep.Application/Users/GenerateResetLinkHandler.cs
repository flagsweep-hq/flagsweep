namespace Flagsweep.Application.Users;

public record ResetLinkResponse(string Email, string Token, string ResetUrl);

public record GenerateResetLinkCommand(string UserId, string BaseUrl)
    : IRequest<Result<ResetLinkResponse>>;

public class GenerateResetLinkHandler(UserManager<ApplicationUser> userManager)
    : IRequestHandler<GenerateResetLinkCommand, Result<ResetLinkResponse>>
{
    public async Task<Result<ResetLinkResponse>> HandleAsync(
        GenerateResetLinkCommand command,
        CancellationToken ct = default
    )
    {
        var user = await userManager.FindByIdAsync(command.UserId);
        if (user is null)
            return UserErrors.NotFound();

        var token = await userManager.GeneratePasswordResetTokenAsync(user);
        var encodedToken = Uri.EscapeDataString(token);
        var resetUrl =
            $"{command.BaseUrl}/reset-password?email={Uri.EscapeDataString(user.Email!)}&token={encodedToken}";

        return new ResetLinkResponse(user.Email!, token, resetUrl);
    }
}
