namespace Flagsweep.Application.Users;

public record GetCurrentUserQuery() : IRequest<Result<UserDto>>;

public class GetCurrentUserHandler(
    UserManager<ApplicationUser> userManager,
    IUserContext userContext
) : IRequestHandler<GetCurrentUserQuery, Result<UserDto>>
{
    public async Task<Result<UserDto>> HandleAsync(
        GetCurrentUserQuery request,
        CancellationToken ct = default
    )
    {
        if (!userContext.IsAuthenticated || string.IsNullOrWhiteSpace(userContext.UserId))
            return UserErrors.NotAuthenticated();

        var user = await userManager.FindByIdAsync(userContext.UserId);
        if (user is null)
            return UserErrors.UnknownUser();

        return UserDto.FromEntity(user);
    }
}
