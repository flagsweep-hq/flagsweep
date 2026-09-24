namespace Flagsweep.Application.Flags;

public record ListFlagsQuery(int ConnectionId, string? Label, int? Limit = null, int? Offset = null)
    : IRequest<Result<PagedResult<FlagDto>>>;

public class ListFlagsHandler(IFlagsweepDbContext db, IFlagStoreProviderFactory providerFactory)
    : IRequestHandler<ListFlagsQuery, Result<PagedResult<FlagDto>>>
{
    public async Task<Result<PagedResult<FlagDto>>> HandleAsync(
        ListFlagsQuery request,
        CancellationToken ct = default
    )
    {
        var connection = await FlagQueries.GetConnectionAsync(db, request.ConnectionId, ct);
        if (connection is null)
            return new PagedResult<FlagDto>([], 0, 0);

        var provider = providerFactory.Create(connection);

        var driftAnchors = await FlagDriftAnchors.LoadAsync(
            db,
            request.ConnectionId,
            request.Label,
            ct
        );
        var owners = await FlagQueries.LoadOwnersAsync(db, request.ConnectionId, ct);

        var flags = new List<FlagDto>();
        await foreach (var flag in provider.ListFlagsAsync(request.Label, ct))
        {
            var owner = owners.GetValueOrDefault(flag.Id, FlagOwnerInfo.None);
            flags.Add(
                FlagDto.FromFlag(flag) with
                {
                    ModifiedExternally = FlagDriftAnchors.ComputeDrift(flag, driftAnchors),
                    OwnerId = owner.UserId,
                    OwnerEmail = owner.Email,
                    OwnerIsDeleted = owner.IsDeleted,
                }
            );
        }

        return flags
            .OrderBy(f => f.Id, StringComparer.OrdinalIgnoreCase)
            .ToList()
            .ToPagedResult(request.Limit, request.Offset);
    }
}
