namespace Flagsweep.Application.Connections;

public record StoreMetadata(string? StoreName, string Endpoint, List<string> Labels);

public record DiscoverStoreRequest(ProviderType ProviderType, string ConnectionString)
    : IRequest<Result<StoreMetadata>>;

public class DiscoverStoreRequestValidator : AbstractValidator<DiscoverStoreRequest>
{
    public DiscoverStoreRequestValidator()
    {
        RuleFor(x => x.ProviderType).IsInEnum();
        RuleFor(x => x.ConnectionString).ValidConnectionString();
    }
}

public class DiscoverStoreHandler(IFlagsweepDbContext db, IFlagStoreProviderFactory providerFactory)
    : IRequestHandler<DiscoverStoreRequest, Result<StoreMetadata>>
{
    public async Task<Result<StoreMetadata>> HandleAsync(
        DiscoverStoreRequest req,
        CancellationToken ct = default
    )
    {
        var endpoint = StoreEndpoint.Parse(req.ConnectionString)!;
        var existing = await ConnectionQueries.ConnectionNameForEndpointAsync(
            db,
            endpoint,
            null,
            ct
        );
        if (existing is not null)
            return ConnectionErrors.StoreAlreadyConnected(existing);

        try
        {
            var provider = providerFactory.Create(req.ProviderType, req.ConnectionString.Trim());
            var labels = await provider.ListLabelsAsync(ct).ToListAsync(ct);
            return new StoreMetadata(provider.StoreName, endpoint, labels);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return ConnectionErrors.StoreUnreachable(ex.Message);
        }
    }
}
