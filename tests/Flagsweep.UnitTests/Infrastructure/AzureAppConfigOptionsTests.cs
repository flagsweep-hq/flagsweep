using Flagsweep.Infrastructure.Configuration;

namespace Flagsweep.UnitTests.Infrastructure;

public class AzureAppConfigOptionsTests
{
    [Fact]
    public void ParseStoreName_FromConnectionString_ExtractsName()
    {
        var connStr = "Endpoint=https://mystore.azconfig.io;Id=abc;Secret=xyz";

        AzureAppConfigOptions.ParseStoreName(connStr).Should().Be("mystore");
    }

    [Fact]
    public void ParseStoreName_InvalidString_ReturnsNull()
    {
        AzureAppConfigOptions.ParseStoreName("not-a-connection-string").Should().BeNull();
    }

    [Fact]
    public void ParseStoreName_EmptyJson_ReturnsNull()
    {
        AzureAppConfigOptions.ParseStoreName("{}").Should().BeNull();
    }

    [Fact]
    public void ParseStoreName_RawEndpointUrl_ReturnsNull()
    {
        AzureAppConfigOptions.ParseStoreName("https://mystore.azconfig.io").Should().BeNull();
    }
}
