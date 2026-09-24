using System.Text.Json;

namespace Flagsweep.Application.Flags;

internal static class FlagDriftAnchors
{
    internal static async Task<Dictionary<string, DateTimeOffset>> LoadAsync(
        IFlagsweepDbContext db,
        int connectionId,
        string? label,
        CancellationToken ct
    )
    {
        var env = await db.Environments.FirstOrDefaultAsync(
            e => e.ConnectionId == connectionId && e.EnvironmentKey == label,
            ct
        );
        if (env is null)
            return NewAnchorMap();

        var audits = await QueryAsync(db, connectionId, e => e.EnvironmentId == env.Id, ct);
        var anchors = NewAnchorMap();
        foreach (var audit in audits)
            Fold(anchors, audit);
        return anchors;
    }

    internal static async Task<Dictionary<string, Dictionary<string, DateTimeOffset>>> LoadAllAsync(
        IFlagsweepDbContext db,
        int connectionId,
        CancellationToken ct
    )
    {
        var environments = await db
            .Environments.Where(e => e.ConnectionId == connectionId)
            .Select(e => new { e.Id, e.EnvironmentKey })
            .ToListAsync(ct);

        var byLabel = new Dictionary<string, Dictionary<string, DateTimeOffset>>(
            StringComparer.OrdinalIgnoreCase
        );
        if (environments.Count == 0)
            return byLabel;

        var labelByEnvId = environments.ToDictionary(e => e.Id, e => e.EnvironmentKey ?? "");
        var envIds = labelByEnvId.Keys.ToList();
        var audits = await QueryAsync(db, connectionId, e => envIds.Contains(e.EnvironmentId), ct);

        foreach (var audit in audits)
        {
            if (!labelByEnvId.TryGetValue(audit.EnvironmentId, out var label))
                continue;
            if (!byLabel.TryGetValue(label, out var anchors))
                byLabel[label] = anchors = NewAnchorMap();
            Fold(anchors, audit);
        }
        return byLabel;
    }

    internal static bool? ComputeDrift(FeatureFlag flag, Dictionary<string, DateTimeOffset> anchors)
    {
        if (!anchors.TryGetValue(flag.Id, out var anchor))
            return null;
        return flag.LastModified is null ? null : flag.LastModified > anchor;
    }

    private static Dictionary<string, DateTimeOffset> NewAnchorMap() =>
        new(StringComparer.OrdinalIgnoreCase);

    private sealed record AuditRow(
        int EnvironmentId,
        string ChangesJson,
        DateTimeOffset? ProviderTimestamp,
        DateTime CreatedAt
    );

    private static async Task<List<AuditRow>> QueryAsync(
        IFlagsweepDbContext db,
        int connectionId,
        System.Linq.Expressions.Expression<Func<Domain.Models.AuditEntry, bool>> scope,
        CancellationToken ct
    ) =>
        await db
            .AuditEntries.Where(e => e.ConnectionId == connectionId)
            .Where(scope)
            .Select(e => new AuditRow(
                e.EnvironmentId,
                e.ChangesJson,
                e.ProviderTimestamp,
                e.CreatedAt
            ))
            .ToListAsync(ct);

    private static void Fold(Dictionary<string, DateTimeOffset> anchors, AuditRow audit)
    {
        var anchor =
            audit.ProviderTimestamp
            ?? new DateTimeOffset(
                DateTime.SpecifyKind(audit.CreatedAt, DateTimeKind.Utc)
            ).AddMinutes(2);

        List<FlagChange>? changes;
        try
        {
            changes = JsonSerializer.Deserialize<List<FlagChange>>(audit.ChangesJson);
        }
        catch (JsonException)
        {
            return;
        }

        foreach (var change in changes ?? [])
        {
            if (!anchors.TryGetValue(change.FlagId, out var current) || anchor > current)
                anchors[change.FlagId] = anchor;
        }
    }
}
