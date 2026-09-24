namespace Flagsweep.Application.Users;

public record ListUsersQuery(int? Limit = null, int? Offset = null)
    : IRequest<Result<PagedResult<UserDto>>>;

public class ListUsersHandler(IFlagsweepDbContext db)
    : IRequestHandler<ListUsersQuery, Result<PagedResult<UserDto>>>
{
    public async Task<Result<PagedResult<UserDto>>> HandleAsync(
        ListUsersQuery request,
        CancellationToken ct = default
    )
    {
        var page = await db
            .Users.IgnoreQueryFilters()
            .OrderBy(u => u.CreatedAt)
            .ToPagedResultAsync(request.Limit, request.Offset, ct);

        return page.Map(UserDto.FromEntity);
    }
}
