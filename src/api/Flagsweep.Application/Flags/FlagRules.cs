using ConnectionEntity = Flagsweep.Domain.Models.Connection;

namespace Flagsweep.Application.Flags;

internal static class FlagErrors
{
    internal static Error ConnectionNotFound() => Error.NotFound("Connection not found.");

    internal static Error NotFound(string id, string? label) =>
        Error.NotFound($"Flag '{id}' not found in label '{label}'.");

    internal static Error Locked() =>
        Error.Conflict("This flag is locked in the store. Unlock it to make changes.");
}

internal static class FlagRules
{
    internal static IRuleBuilderOptions<T, string> ValidFlagId<T>(
        this IRuleBuilder<T, string> rule
    ) => rule.NotEmpty().MaximumLength(200);
}

internal record FlagOwnerInfo(string? UserId, string? Email, bool IsDeleted)
{
    internal static readonly FlagOwnerInfo None = new(null, null, false);
}

internal static class FlagQueries
{
    internal static Task<ConnectionEntity?> GetConnectionAsync(
        IFlagsweepDbContext db,
        int connectionId,
        CancellationToken ct
    ) => db.Connections.FirstOrDefaultAsync(p => p.Id == connectionId, ct);

    internal static async Task<Dictionary<string, FlagOwnerInfo>> LoadOwnersAsync(
        IFlagsweepDbContext db,
        int connectionId,
        CancellationToken ct
    )
    {
        var rows = await db
            .FlagOwners.Where(o => o.ConnectionId == connectionId)
            .Join(
                db.Users.IgnoreQueryFilters(),
                o => o.UserId,
                u => u.Id,
                (o, u) =>
                    new
                    {
                        o.FlagId,
                        o.UserId,
                        u.Email,
                        u.IsDeleted,
                    }
            )
            .ToListAsync(ct);

        var owners = new Dictionary<string, FlagOwnerInfo>(StringComparer.OrdinalIgnoreCase);
        foreach (var row in rows)
            owners[row.FlagId] = new FlagOwnerInfo(row.UserId, row.Email, row.IsDeleted);
        return owners;
    }
}
