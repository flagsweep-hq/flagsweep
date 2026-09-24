namespace Flagsweep.Application.Connections;

public record DeleteEnvironmentCommand(int ConnectionId, int EnvironmentId) : IRequest<Result>;

public class DeleteEnvironmentHandler(IFlagsweepDbContext db)
    : IRequestHandler<DeleteEnvironmentCommand, Result>
{
    public async Task<Result> HandleAsync(
        DeleteEnvironmentCommand request,
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
            return ConnectionErrors.EnvironmentNotFound(request.EnvironmentId);

        db.Environments.Remove(env);
        await db.SaveChangesAsync(ct);

        return Result.Ok();
    }
}
