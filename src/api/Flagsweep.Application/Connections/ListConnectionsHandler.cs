namespace Flagsweep.Application.Connections;

public record ListConnectionsQuery(int? Limit = null, int? Offset = null)
    : IRequest<Result<PagedResult<ConnectionDto>>>;

public class ListConnectionsHandler(IFlagsweepDbContext db)
    : IRequestHandler<ListConnectionsQuery, Result<PagedResult<ConnectionDto>>>
{
    public async Task<Result<PagedResult<ConnectionDto>>> HandleAsync(
        ListConnectionsQuery request,
        CancellationToken ct = default
    )
    {
        var page = await db
            .Connections.Include(p => p.Environments.OrderBy(e => e.SortOrder))
            .OrderBy(p => p.CreatedAt)
            .ToPagedResultAsync(request.Limit, request.Offset, ct);

        return page.Map(ConnectionDto.FromEntity);
    }
}
