namespace Flagsweep.Application.Users;

public record CheckSetupQuery() : IRequest<Result<bool>>;

public class CheckSetupHandler(IFlagsweepDbContext db)
    : IRequestHandler<CheckSetupQuery, Result<bool>>
{
    public async Task<Result<bool>> HandleAsync(
        CheckSetupQuery request,
        CancellationToken ct = default
    ) => await db.Users.AnyAsync(u => u.Role == Roles.Admin, ct);
}
