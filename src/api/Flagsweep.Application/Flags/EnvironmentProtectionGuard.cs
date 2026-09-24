namespace Flagsweep.Application.Flags;

internal static class EnvironmentProtectionGuard
{
    internal static async Task<Result?> CheckAsync(
        IFlagsweepDbContext db,
        IUserContext userContext,
        int connectionId,
        string? label,
        CancellationToken ct
    )
    {
        if (string.IsNullOrEmpty(label))
            return null;
        if (userContext.IsAdmin)
            return null;

        var isProtected = await db.Environments.AnyAsync(
            e => e.ConnectionId == connectionId && e.EnvironmentKey == label && e.IsProtected,
            ct
        );

        return isProtected
            ? Result.Fail(Error.Forbidden("This environment is protected. Admin role required."))
            : null;
    }
}
