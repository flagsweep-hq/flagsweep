namespace Flagsweep.Application.Flags;

public record FlagMatrixRow(
    string FlagId,
    string? DisplayName,
    string? Description,
    string? OwnerId,
    string? OwnerEmail,
    bool OwnerIsDeleted,
    IReadOnlyList<FlagDto> Copies
);

public record ListFlagMatrixQuery(int ConnectionId, int? Limit = null, int? Offset = null)
    : IRequest<Result<PagedResult<FlagMatrixRow>>>;

public class ListFlagMatrixHandler(
    IFlagsweepDbContext db,
    IFlagStoreProviderFactory providerFactory
) : IRequestHandler<ListFlagMatrixQuery, Result<PagedResult<FlagMatrixRow>>>
{
    public async Task<Result<PagedResult<FlagMatrixRow>>> HandleAsync(
        ListFlagMatrixQuery request,
        CancellationToken ct = default
    )
    {
        var connection = await FlagQueries.GetConnectionAsync(db, request.ConnectionId, ct);
        if (connection is null)
            return new PagedResult<FlagMatrixRow>([], 0, 0);

        var provider = providerFactory.Create(connection);
        var anchorsByLabel = await FlagDriftAnchors.LoadAllAsync(db, request.ConnectionId, ct);
        var owners = await FlagQueries.LoadOwnersAsync(db, request.ConnectionId, ct);

        var copiesByFlag = new Dictionary<string, List<FlagDto>>(StringComparer.OrdinalIgnoreCase);
        await foreach (var flag in provider.ListFlagsAcrossLabelsAsync(ct))
        {
            var owner = owners.GetValueOrDefault(flag.Id, FlagOwnerInfo.None);
            var anchors = anchorsByLabel.GetValueOrDefault(flag.Label ?? "", []);

            var dto = FlagDto.FromFlag(flag) with
            {
                ModifiedExternally = FlagDriftAnchors.ComputeDrift(flag, anchors),
                OwnerId = owner.UserId,
                OwnerEmail = owner.Email,
                OwnerIsDeleted = owner.IsDeleted,
            };

            if (!copiesByFlag.TryGetValue(flag.Id, out var copies))
                copiesByFlag[flag.Id] = copies = [];
            copies.Add(dto);
        }

        var rows = copiesByFlag
            .OrderBy(pair => pair.Key, StringComparer.OrdinalIgnoreCase)
            .Select(pair => BuildRow(pair.Key, pair.Value, owners))
            .ToList();

        return rows.ToPagedResult(request.Limit, request.Offset);
    }

    private static FlagMatrixRow BuildRow(
        string flagId,
        List<FlagDto> copies,
        Dictionary<string, FlagOwnerInfo> owners
    )
    {
        var ordered = copies.OrderBy(c => c.Label ?? "", StringComparer.OrdinalIgnoreCase).ToList();

        var owner = owners.GetValueOrDefault(flagId, FlagOwnerInfo.None);
        return new FlagMatrixRow(
            flagId,
            ordered.Select(c => c.DisplayName).FirstOrDefault(n => !string.IsNullOrWhiteSpace(n)),
            ordered.Select(c => c.Description).FirstOrDefault(d => !string.IsNullOrWhiteSpace(d)),
            owner.UserId,
            owner.Email,
            owner.IsDeleted,
            ordered
        );
    }
}
