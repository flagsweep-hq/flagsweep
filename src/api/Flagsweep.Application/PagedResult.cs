namespace Flagsweep.Application;

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Offset)
{
    public bool HasMore => Offset + Items.Count < Total;

    public PagedResult<TOut> Map<TOut>(Func<T, TOut> selector) =>
        new(Items.Select(selector).ToList(), Total, Offset);
}

public static class Paging
{
    public const int DefaultLimit = 50;
    public const int MaxLimit = 500;

    public static int NormalizeLimit(int? limit) => Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);

    public static int NormalizeOffset(int? offset) => Math.Max(offset ?? 0, 0);

    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        int? limit,
        int? offset,
        CancellationToken ct
    )
    {
        var take = NormalizeLimit(limit);
        var skip = NormalizeOffset(offset);
        var total = await query.CountAsync(ct);
        var items = await query.Skip(skip).Take(take).ToListAsync(ct);
        return new PagedResult<T>(items, total, skip);
    }

    public static PagedResult<T> ToPagedResult<T>(
        this IReadOnlyList<T> items,
        int? limit,
        int? offset
    )
    {
        var take = NormalizeLimit(limit);
        var skip = NormalizeOffset(offset);
        return new PagedResult<T>(items.Skip(skip).Take(take).ToList(), items.Count, skip);
    }
}
