namespace Flagsweep.Application.Users;

public record ChangeRoleRequest(string Role);

public record ChangeRoleCommand(string Id, ChangeRoleRequest Request) : IRequest<Result>;

public class ChangeRoleHandler(
    UserManager<ApplicationUser> userManager,
    IUserContext userContext,
    IFlagsweepDbContext db
) : IRequestHandler<ChangeRoleCommand, Result>
{
    public async Task<Result> HandleAsync(ChangeRoleCommand command, CancellationToken ct = default)
    {
        if (userContext.UserId == command.Id)
            return UserErrors.CannotChangeOwnRole();

        var user = await userManager.FindByIdAsync(command.Id);
        if (user is null)
            return UserErrors.NotFound();

        if (command.Request.Role != Roles.Admin && await UserQueries.IsLastAdminAsync(db, user, ct))
            return UserErrors.CannotDemoteLastAdmin();

        user.Role = command.Request.Role;
        await userManager.UpdateAsync(user);
        return Result.Ok();
    }
}

public class ChangeRoleCommandValidator : AbstractValidator<ChangeRoleCommand>
{
    public ChangeRoleCommandValidator()
    {
        RuleFor(x => x.Request.Role)
            .NotEmpty()
            .Must(Roles.IsValid)
            .WithMessage("Role must be 'Admin' or 'Member'.");
    }
}
