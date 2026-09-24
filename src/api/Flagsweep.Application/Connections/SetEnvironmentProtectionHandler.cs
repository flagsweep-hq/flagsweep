namespace Flagsweep.Application.Connections;

public record SetEnvironmentProtectionCommand(int ConnectionId, int EnvironmentId, bool IsProtected)
    : IRequest<Result>;

public class SetEnvironmentProtectionHandler(IFlagsweepDbContext db)
    : IRequestHandler<SetEnvironmentProtectionCommand, Result>
{
    public async Task<Result> HandleAsync(
        SetEnvironmentProtectionCommand request,
        CancellationToken ct = default
    )
    {
        var env = await ConnectionQueries.FindEnvironmentAsync(
            db,
            request.ConnectionId,
            request.EnvironmentId,
            ct
        );

        if (env is null)
            return ConnectionErrors.EnvironmentNotFoundInConnection(
                request.EnvironmentId,
                request.ConnectionId
            );

        env.SetProtection(request.IsProtected);
        await db.SaveChangesAsync(ct);
        return Result.Ok();
    }
}
