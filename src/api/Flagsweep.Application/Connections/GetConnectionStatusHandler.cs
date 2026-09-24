namespace Flagsweep.Application.Connections;

public record ConnectionStatus(string Status, string? Message, DateTimeOffset CheckedAt)
{
    public const string Connected = "connected";
    public const string Failed = "failed";
}

public record GetConnectionStatusQuery(int Id) : IRequest<Result<ConnectionStatus>>;

public class GetConnectionStatusHandler(
    IFlagsweepDbContext db,
    IFlagStoreProviderFactory providerFactory,
    TimeProvider timeProvider
) : IRequestHandler<GetConnectionStatusQuery, Result<ConnectionStatus>>
{
    public async Task<Result<ConnectionStatus>> HandleAsync(
        GetConnectionStatusQuery query,
        CancellationToken ct = default
    )
    {
        var connection = await db.Connections.FindAsync([query.Id], ct);
        if (connection is null)
            return ConnectionErrors.NotFound(query.Id);

        try
        {
            var provider = providerFactory.Create(connection);
            var labelCount = await provider.ListLabelsAsync(ct).Take(50).CountAsync(ct);
            return new ConnectionStatus(
                ConnectionStatus.Connected,
                $"Connected successfully. Found {labelCount} label(s).",
                timeProvider.GetUtcNow()
            );
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return new ConnectionStatus(
                ConnectionStatus.Failed,
                ex.Message,
                timeProvider.GetUtcNow()
            );
        }
    }
}
