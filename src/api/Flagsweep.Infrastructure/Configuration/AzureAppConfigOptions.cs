namespace Flagsweep.Infrastructure.Configuration;

public static class AzureAppConfigOptions
{
    public static string? ParseStoreName(string connectionString) =>
        StoreEndpoint.Parse(connectionString) is { } endpoint
            ? new Uri(endpoint).Host.Split('.')[0]
            : null;
}
