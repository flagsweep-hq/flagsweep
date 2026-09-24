using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using Flagsweep.Domain;

namespace Flagsweep.Infrastructure.Sandbox;

public class FakeAzureProvider : IFlagStoreProvider
{
    public string? StoreName => "Fake Azure Store";

    private readonly ConcurrentDictionary<(string Id, string Label), FeatureFlag> _flags = new();

    public async IAsyncEnumerable<FeatureFlag> ListFlagsAsync(
        string? label,
        [EnumeratorCancellation] CancellationToken ct = default
    )
    {
        var key = label ?? "";
        foreach (var flag in _flags.Values.Where(f => (f.Label ?? "") == key))
            yield return flag;
        await Task.CompletedTask;
    }

    public async IAsyncEnumerable<FeatureFlag> ListFlagsAcrossLabelsAsync(
        [EnumeratorCancellation] CancellationToken ct = default
    )
    {
        foreach (var flag in _flags.Values)
            yield return flag;
        await Task.CompletedTask;
    }

    public async IAsyncEnumerable<string> ListLabelsAsync(
        [EnumeratorCancellation] CancellationToken ct = default
    )
    {
        var labels = _flags
            .Values.Select(f => f.Label)
            .Where(l => !string.IsNullOrEmpty(l))
            .Distinct(StringComparer.OrdinalIgnoreCase);
        foreach (var label in labels)
            yield return label!;
        await Task.CompletedTask;
    }

    public Task<DateTimeOffset?> UpsertFlagAsync(FeatureFlag flag, CancellationToken ct = default)
    {
        var key = (flag.Id, flag.Label ?? "");
        if (_flags.TryGetValue(key, out var existing) && existing.IsLocked)
            throw new FlagLockedException(flag.Id);

        var stamped = flag with { LastModified = DateTimeOffset.UtcNow, IsLocked = false };
        _flags[key] = stamped;
        return Task.FromResult(stamped.LastModified);
    }

    public Task DeleteFlagAsync(string flagId, string? label, CancellationToken ct = default)
    {
        var key = (flagId, label ?? "");
        if (_flags.TryGetValue(key, out var existing) && existing.IsLocked)
            throw new FlagLockedException(flagId);

        _flags.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public Task<DateTimeOffset?> SetLockAsync(
        string flagId,
        string? label,
        bool locked,
        CancellationToken ct = default
    )
    {
        var key = (flagId, label ?? "");
        if (!_flags.TryGetValue(key, out var existing))
            return Task.FromResult<DateTimeOffset?>(null);

        var stamped = existing with { IsLocked = locked, LastModified = DateTimeOffset.UtcNow };
        _flags[key] = stamped;
        return Task.FromResult(stamped.LastModified);
    }
}
