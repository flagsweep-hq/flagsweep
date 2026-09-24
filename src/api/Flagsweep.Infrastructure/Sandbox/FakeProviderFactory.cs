using System.Collections.Concurrent;

namespace Flagsweep.Infrastructure.Sandbox;

public class FakeProviderFactory : IFlagStoreProviderFactory
{
    private readonly ConcurrentDictionary<string, IFlagStoreProvider> _providers = new();

    public IFlagStoreProvider Create(Connection connection) =>
        GetOrCreate(connection.ProviderType, connection.Endpoint);

    public IFlagStoreProvider Create(ProviderType providerType, string connectionString) =>
        GetOrCreate(
            providerType,
            StoreEndpoint.Parse(connectionString)
                ?? throw new InvalidOperationException("Connection string has no valid Endpoint.")
        );

    public void Clear() => _providers.Clear();

    private IFlagStoreProvider GetOrCreate(ProviderType providerType, string endpoint) =>
        _providers.GetOrAdd(
            endpoint,
            _ =>
                providerType switch
                {
                    ProviderType.Azure => new FakeAzureProvider(),
                    _ => throw new ArgumentException(
                        $"Provider type '{providerType}' is not supported."
                    ),
                }
        );
}
