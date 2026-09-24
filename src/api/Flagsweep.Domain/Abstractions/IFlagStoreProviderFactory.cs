namespace Flagsweep.Domain.Abstractions;

public interface IFlagStoreProviderFactory
{
    IFlagStoreProvider Create(Connection connection);

    IFlagStoreProvider Create(ProviderType providerType, string connectionString);
}
