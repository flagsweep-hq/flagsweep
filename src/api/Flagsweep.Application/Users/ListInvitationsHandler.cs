namespace Flagsweep.Application.Users;

public record ListInvitationsQuery(int? Limit = null, int? Offset = null)
    : IRequest<Result<PagedResult<InvitationDto>>>;

public class ListInvitationsHandler(IFlagsweepDbContext db, TimeProvider timeProvider)
    : IRequestHandler<ListInvitationsQuery, Result<PagedResult<InvitationDto>>>
{
    public async Task<Result<PagedResult<InvitationDto>>> HandleAsync(
        ListInvitationsQuery request,
        CancellationToken ct = default
    )
    {
        var utcNow = timeProvider.GetUtcNow().UtcDateTime;

        var page = await db
            .Invitations.Where(i => i.ExpiresAt > utcNow)
            .OrderByDescending(i => i.CreatedAt)
            .ToPagedResultAsync(request.Limit, request.Offset, ct);

        return page.Map(InvitationDto.FromEntity);
    }
}
