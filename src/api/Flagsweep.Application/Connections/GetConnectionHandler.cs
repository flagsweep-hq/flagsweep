namespace Flagsweep.Application.Connections;

public record GetConnectionQuery(int Id) : IRequest<Result<ConnectionDto>>;

public class GetConnectionHandler(IFlagsweepDbContext db)
    : IRequestHandler<GetConnectionQuery, Result<ConnectionDto>>
{
    public async Task<Result<ConnectionDto>> HandleAsync(
        GetConnectionQuery request,
        CancellationToken ct = default
    )
    {
        var connection = await db
            .Connections.Include(p => p.Environments.OrderBy(e => e.SortOrder))
            .FirstOrDefaultAsync(p => p.Id == request.Id, ct);

        if (connection is null)
            return ConnectionErrors.NotFound(request.Id);

        return ConnectionDto.FromEntity(connection);
    }
}
