namespace Flagsweep.Application.Connections;

public record UpdateEnvironmentRequest(string? Name, string? EnvironmentKey);

public record UpdateEnvironmentCommand(
    int ConnectionId,
    int EnvironmentId,
    UpdateEnvironmentRequest Request
) : IRequest<Result<EnvironmentDto>>;

public class UpdateEnvironmentHandler(IFlagsweepDbContext db)
    : IRequestHandler<UpdateEnvironmentCommand, Result<EnvironmentDto>>
{
    public async Task<Result<EnvironmentDto>> HandleAsync(
        UpdateEnvironmentCommand request,
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

        env.Update(request.Request.Name, request.Request.EnvironmentKey);

        await db.SaveChangesAsync(ct);

        return EnvironmentDto.FromEntity(env);
    }
}
