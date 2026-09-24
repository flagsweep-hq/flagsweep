namespace Flagsweep.Application.Audit;

public record ListAuditEntriesQuery(
    int ConnectionId,
    int? EnvironmentId = null,
    int? Limit = null,
    int? Offset = null
) : IRequest<Result<PagedResult<AuditEntryDto>>>;

public class ListAuditEntriesHandler(IFlagsweepDbContext db)
    : IRequestHandler<ListAuditEntriesQuery, Result<PagedResult<AuditEntryDto>>>
{
    public async Task<Result<PagedResult<AuditEntryDto>>> HandleAsync(
        ListAuditEntriesQuery request,
        CancellationToken ct = default
    )
    {
        var query = db.AuditEntries.Where(e => e.ConnectionId == request.ConnectionId);

        if (request.EnvironmentId is not null)
            query = query.Where(e => e.EnvironmentId == request.EnvironmentId.Value);

        var page = await query
            .OrderByDescending(e => e.CreatedAt)
            .ToPagedResultAsync(request.Limit, request.Offset, ct);
        var entries = page.Items;

        var userIds = entries.Select(e => e.TriggeredById).Distinct().ToList();

        var emails = await db
            .Users.IgnoreQueryFilters()
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, Email = u.Email ?? string.Empty })
            .ToDictionaryAsync(u => u.Id, u => u.Email, ct);

        return page.Map(e =>
            AuditEntryDto.FromEntity(
                e,
                emails.TryGetValue(e.TriggeredById, out var email) ? email : string.Empty
            )
        );
    }
}
