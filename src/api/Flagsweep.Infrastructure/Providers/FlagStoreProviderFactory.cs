using Azure.Data.AppConfiguration;
using Flagsweep.Infrastructure.Configuration;

namespace Flagsweep.Infrastructure.Providers;

public class FlagStoreProviderFactory(IConnectionStringProtector protector)
    : IFlagStoreProviderFactory
{
    public IFlagStoreProvider Create(Connection connection) =>
        Create(connection.ProviderType, protector.Unprotect(connection.ConnectionString));

    public IFlagStoreProvider Create(ProviderType providerType, string connectionString) =>
        providerType switch
        {
            ProviderType.Azure => CreateAzureProvider(connectionString),
            _ => throw new ArgumentException($"Provider type '{providerType}' is not supported."),
        };

    private static ConfigurationClientOptions InteractiveClientOptions()
    {
        var options = new ConfigurationClientOptions();
        options.Retry.NetworkTimeout = TimeSpan.FromSeconds(10);
        options.Retry.MaxRetries = 1;
        options.Retry.Delay = TimeSpan.FromMilliseconds(500);
        return options;
    }

    private static AzureAppConfigProvider CreateAzureProvider(string connString)
    {
        if (string.IsNullOrEmpty(connString))
            throw new InvalidOperationException("Azure connection is missing configuration.");

        var client = new ConfigurationClient(connString, InteractiveClientOptions());
        return new AzureAppConfigProvider(client, AzureAppConfigOptions.ParseStoreName(connString));
    }
}
