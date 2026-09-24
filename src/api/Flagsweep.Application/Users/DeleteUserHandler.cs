namespace Flagsweep.Application.Users;

public record DeleteUserCommand(string Id) : IRequest<Result>;

public class DeleteUserHandler(
    UserManager<ApplicationUser> userManager,
    IUserContext userContext,
    IFlagsweepDbContext db
) : IRequestHandler<DeleteUserCommand, Result>
{
    public async Task<Result> HandleAsync(DeleteUserCommand command, CancellationToken ct = default)
    {
        if (userContext.UserId == command.Id)
            return UserErrors.CannotDeleteSelf();

        var user = await userManager.FindByIdAsync(command.Id);
        if (user is null)
            return UserErrors.NotFound();

        if (await UserQueries.IsLastAdminAsync(db, user, ct))
            return UserErrors.CannotDeleteLastAdmin();

        await userManager.DeleteAsync(user);
        return Result.Ok();
    }
}
