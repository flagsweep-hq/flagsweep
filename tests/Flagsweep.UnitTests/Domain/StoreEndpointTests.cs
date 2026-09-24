using Flagsweep.Domain.Models;

namespace Flagsweep.UnitTests.Domain;

public class StoreEndpointTests
{
    [Theory]
    [InlineData("Endpoint=https://store.azconfig.io;Id=a;Secret=cw==", "https://store.azconfig.io")]
    [InlineData(
        "Endpoint=https://STORE.azconfig.io/;Id=b;Secret=dA==",
        "https://store.azconfig.io"
    )]
    [InlineData(
        " Id=a ; endpoint=https://store.azconfig.io ;Secret=cw==",
        "https://store.azconfig.io"
    )]
    [InlineData(
        "Endpoint=https://store.azconfig.io:443;Id=a;Secret=cw==",
        "https://store.azconfig.io"
    )]
    [InlineData(
        "Endpoint=http://localhost:4577/Acct-appconfig/;Id=a;Secret=cw==",
        "http://localhost:4577/acct-appconfig"
    )]
    public void Parse_NormalizesEndpoint(string connectionString, string expected)
    {
        StoreEndpoint.Parse(connectionString).Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Id=a;Secret=cw==")]
    [InlineData("Endpoint=;Id=a;Secret=cw==")]
    [InlineData("Endpoint=store.azconfig.io;Id=a;Secret=cw==")]
    [InlineData("Endpoint=ftp://store.azconfig.io;Id=a;Secret=cw==")]
    public void Parse_NoValidEndpoint_ReturnsNull(string? connectionString)
    {
        StoreEndpoint.Parse(connectionString).Should().BeNull();
    }
}
