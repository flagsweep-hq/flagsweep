namespace Flagsweep.Application.Flags;

internal static class FlagAudit
{
    internal static async Task RecordAsync(
        IFlagsweepDbContext db,
        int connectionId,
        string? label,
        string? triggeredById,
        IReadOnlyList<FlagChange> changes,
        DateTimeOffset? providerTimestamp,
        CancellationToken ct
    )
    {
        if (string.IsNullOrEmpty(triggeredById) || changes.Count == 0)
            return;

        var env = await db.Environments.FirstOrDefaultAsync(
            e => e.ConnectionId == connectionId && e.EnvironmentKey == label,
            ct
        );
        if (env is null)
            return;

        db.AuditEntries.Add(
            AuditEntry.Create(env.ConnectionId, env.Id, triggeredById, changes, providerTimestamp)
        );
        await db.SaveChangesAsync(ct);
    }
}
