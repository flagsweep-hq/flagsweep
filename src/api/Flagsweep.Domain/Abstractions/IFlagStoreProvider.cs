namespace Flagsweep.Domain.Abstractions;

public interface IFlagStoreProvider
{
    string? StoreName { get; }

    IAsyncEnumerable<FeatureFlag> ListFlagsAsync(string? label, CancellationToken ct = default);

    IAsyncEnumerable<FeatureFlag> ListFlagsAcrossLabelsAsync(CancellationToken ct = default);

    IAsyncEnumerable<string> ListLabelsAsync(CancellationToken ct = default);

    Task<DateTimeOffset?> UpsertFlagAsync(FeatureFlag flag, CancellationToken ct = default);

    Task DeleteFlagAsync(string flagId, string? label, CancellationToken ct = default);

    Task<DateTimeOffset?> SetLockAsync(
        string flagId,
        string? label,
        bool locked,
        CancellationToken ct = default
    );
}
