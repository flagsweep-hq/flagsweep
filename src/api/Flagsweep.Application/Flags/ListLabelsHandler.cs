namespace Flagsweep.Application.Flags;

public record ListLabelsQuery(int ConnectionId) : IRequest<Result<List<string>>>;

public class ListLabelsHandler(IFlagsweepDbContext db, IFlagStoreProviderFactory providerFactory)
    : IRequestHandler<ListLabelsQuery, Result<List<string>>>
{
    public async Task<Result<List<string>>> HandleAsync(
        ListLabelsQuery request,
        CancellationToken ct = default
    )
    {
        var connection = await FlagQueries.GetConnectionAsync(db, request.ConnectionId, ct);
        if (connection is null)
            return Error.NotFound("Connection not found.");

        var provider = providerFactory.Create(connection);
        return await provider.ListLabelsAsync(ct).ToListAsync(ct);
    }
}
