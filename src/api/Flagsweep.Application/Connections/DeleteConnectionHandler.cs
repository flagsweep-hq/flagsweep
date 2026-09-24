namespace Flagsweep.Application.Connections;

public record DeleteConnectionCommand(int Id) : IRequest<Result>;

public class DeleteConnectionHandler(IFlagsweepDbContext db)
    : IRequestHandler<DeleteConnectionCommand, Result>
{
    public async Task<Result> HandleAsync(
        DeleteConnectionCommand request,
        CancellationToken ct = default
    )
    {
        var connection = await db
            .Connections.Include(p => p.Environments)
            .FirstOrDefaultAsync(p => p.Id == request.Id, ct);

        if (connection is null)
            return ConnectionErrors.NotFound(request.Id);

        db.Connections.Remove(connection);
        await db.SaveChangesAsync(ct);
        return Result.Ok();
    }
}
