using Flagsweep.Domain.Abstractions;
using Flagsweep.Domain.Models;
using Flagsweep.Infrastructure.Providers;

namespace Flagsweep.UnitTests.Infrastructure;

public class FlagStoreProviderFactoryTests
{
    private const string ConnString =
        "Endpoint=https://test.azconfig.io;Id=abc;Secret=dGVzdHNlY3JldA==";

    private static FlagStoreProviderFactory CreateFactory()
    {
        var protector = Substitute.For<IConnectionStringProtector>();
        protector.Unprotect(Arg.Any<string>()).Returns(ci => ci.Arg<string>());
        return new FlagStoreProviderFactory(protector);
    }

    private static Connection CreateConnection(ProviderType type = ProviderType.Azure) =>
        Connection.Create("app", type, "https://test.azconfig.io", ConnString);

    [Fact]
    public void Create_AzureConnection_ReturnsAzureProvider()
    {
        var provider = CreateFactory().Create(CreateConnection());

        provider.Should().BeOfType<AzureAppConfigProvider>();
    }

    [Fact]
    public void Create_Connection_DecryptsStoredCredentials()
    {
        var protector = Substitute.For<IConnectionStringProtector>();
        protector.Unprotect("encrypted").Returns(ConnString);
        var connection = Connection.Create(
            "app",
            ProviderType.Azure,
            "https://test.azconfig.io",
            "encrypted"
        );

        var provider = new FlagStoreProviderFactory(protector).Create(connection);

        provider.StoreName.Should().Be("test");
    }

    [Fact]
    public void Create_FromPlaintextConnectionString_ReturnsAzureProvider()
    {
        var provider = CreateFactory().Create(ProviderType.Azure, ConnString);

        provider.Should().BeOfType<AzureAppConfigProvider>();
        provider.StoreName.Should().Be("test");
    }

    [Fact]
    public void Create_EmptyConnectionString_Throws()
    {
        var act = () => CreateFactory().Create(ProviderType.Azure, "");

        act.Should().Throw<InvalidOperationException>().WithMessage("*missing*");
    }

    [Fact]
    public void Create_UnknownProvider_Throws()
    {
        var act = () => CreateFactory().Create(CreateConnection((ProviderType)99));

        act.Should().Throw<ArgumentException>().WithMessage("*not supported*");
    }

    [Fact]
    public void Create_ReturnsFreshProviderPerCall()
    {
        var factory = CreateFactory();
        var connection = CreateConnection();

        var first = factory.Create(connection);
        var second = factory.Create(connection);

        first.Should().NotBeSameAs(second);
    }
}
