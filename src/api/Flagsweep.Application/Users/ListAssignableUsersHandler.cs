namespace Flagsweep.Application.Users;

public record AssignableUserDto(string Id, string Email);

public record ListAssignableUsersQuery(int? Limit = null, int? Offset = null)
    : IRequest<Result<PagedResult<AssignableUserDto>>>;

public class ListAssignableUsersHandler(IFlagsweepDbContext db)
    : IRequestHandler<ListAssignableUsersQuery, Result<PagedResult<AssignableUserDto>>>
{
    public async Task<Result<PagedResult<AssignableUserDto>>> HandleAsync(
        ListAssignableUsersQuery request,
        CancellationToken ct = default
    )
    {
        return await db
            .Users.OrderBy(u => u.Email)
            .Select(u => new AssignableUserDto(u.Id, u.Email!))
            .ToPagedResultAsync(request.Limit, request.Offset, ct);
    }
}
