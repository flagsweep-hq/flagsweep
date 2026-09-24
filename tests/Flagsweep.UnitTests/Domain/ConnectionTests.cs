using Flagsweep.Domain.Models;

namespace Flagsweep.UnitTests.Domain;

public class ConnectionTests
{
    private const string Endpoint = "https://store.azconfig.io";

    private static Connection CreateConnection(string name = "old") =>
        Connection.Create(name, ProviderType.Azure, Endpoint, "encrypted");

    [Fact]
    public void Create_TrimsName_AndSetsConnectionString()
    {
        var connection = Connection.Create("  my app  ", ProviderType.Azure, Endpoint, "encrypted");

        connection.Name.Should().Be("my app");
        connection.ProviderType.Should().Be(ProviderType.Azure);
        connection.Endpoint.Should().Be(Endpoint);
        connection.ConnectionString.Should().Be("encrypted");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_MissingConnection_Throws(string? value)
    {
        var noEndpoint = () => Connection.Create("app", ProviderType.Azure, value!, "encrypted");
        var noSecret = () => Connection.Create("app", ProviderType.Azure, Endpoint, value!);

        noEndpoint.Should().Throw<ArgumentException>();
        noSecret.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void SetConnectionString_ReplacesEndpointAndCredentials()
    {
        var connection = CreateConnection();

        connection.SetConnectionString("https://other.azconfig.io", "rotated");

        connection.Endpoint.Should().Be("https://other.azconfig.io");
        connection.ConnectionString.Should().Be("rotated");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_MissingName_Throws(string? name)
    {
        var act = () => Connection.Create(name!, ProviderType.Azure, Endpoint, "encrypted");

        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Update_TrimsName()
    {
        var connection = CreateConnection();

        connection.Update("  new name  ");

        connection.Name.Should().Be("new name");
    }

    [Fact]
    public void AddEnvironment_FirstEnvironment_SortOrderIsZero()
    {
        var connection = CreateConnection();

        var env = connection.AddEnvironment("Production", "prod");

        env.SortOrder.Should().Be(0);
        env.Name.Should().Be("Production");
        env.EnvironmentKey.Should().Be("prod");
    }

    [Fact]
    public void AddEnvironment_SubsequentEnvironments_IncrementSortOrder()
    {
        var connection = CreateConnection();

        connection.AddEnvironment("Dev", null);
        connection.AddEnvironment("Staging", "staging");
        var third = connection.AddEnvironment("Production", "prod");

        third.SortOrder.Should().Be(2);
        connection.Environments.Should().HaveCount(3);
    }

    [Fact]
    public void AddEnvironment_AddsToEnvironmentsList()
    {
        var connection = CreateConnection();

        var env = connection.AddEnvironment("Test", "test-label");

        connection.Environments.Should().Contain(env);
    }

    [Fact]
    public void AddEnvironment_WithGap_UsesMaxPlusOne()
    {
        var connection = CreateConnection();
        connection.AddEnvironment("Dev", null);
        var second = connection.AddEnvironment("Prod", null);
        typeof(ConnectionEnvironment)
            .GetProperty(nameof(ConnectionEnvironment.SortOrder))!
            .SetValue(second, 5);

        var env = connection.AddEnvironment("New", null);

        env.SortOrder.Should().Be(6);
    }

    [Fact]
    public void AddEnvironment_TrimsName_AndClearsWhitespaceKey()
    {
        var connection = CreateConnection();

        var env = connection.AddEnvironment("  Dev  ", "   ");

        env.Name.Should().Be("Dev");
        env.EnvironmentKey.Should().BeNull();
    }

    [Fact]
    public void HasEnvironmentNamed_IsCaseInsensitive_AndNormalizes()
    {
        var connection = CreateConnection();
        connection.AddEnvironment("Production", null);

        connection.HasEnvironmentNamed("  PRODUCTION ").Should().BeTrue();
        connection.HasEnvironmentNamed("Staging").Should().BeFalse();
    }

    [Fact]
    public void ReorderEnvironments_AssignsSortOrderByPosition()
    {
        var connection = CreateConnection();
        var dev = connection.AddEnvironment("Dev", null);
        var staging = connection.AddEnvironment("Staging", null);
        var prod = connection.AddEnvironment("Prod", null);
        SetId(dev, 1);
        SetId(staging, 2);
        SetId(prod, 3);

        connection.ReorderEnvironments([3, 1, 2]);

        prod.SortOrder.Should().Be(0);
        dev.SortOrder.Should().Be(1);
        staging.SortOrder.Should().Be(2);
    }

    [Fact]
    public void ReorderEnvironments_UnknownIds_AreIgnored()
    {
        var connection = CreateConnection();
        var dev = connection.AddEnvironment("Dev", null);
        SetId(dev, 1);

        connection.ReorderEnvironments([99, 1]);

        dev.SortOrder.Should().Be(1);
    }

    private static void SetId(ConnectionEnvironment env, int id) =>
        typeof(ConnectionEnvironment)
            .GetProperty(nameof(ConnectionEnvironment.Id))!
            .SetValue(env, id);
}
