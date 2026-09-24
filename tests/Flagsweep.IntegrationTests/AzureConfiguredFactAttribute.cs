namespace Flagsweep.IntegrationTests;

public sealed class AzureConfiguredFactAttribute : FactAttribute
{
    public const string ConnectionStringVariable = "AZURE_APPCONFIG_CONNECTION_STRING";

    public AzureConfiguredFactAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(ConnectionStringVariable)))
            Skip = $"{ConnectionStringVariable} is not set.";
    }
}
