using Flagsweep.Domain.Models;

namespace Flagsweep.UnitTests.Domain;

public class ConnectionEnvironmentTests
{
    private static ConnectionEnvironment CreateEnvironment(
        string name = "Dev",
        string? environmentKey = "dev"
    ) =>
        Connection
            .Create("proj", ProviderType.Azure, "https://store.azconfig.io", "encrypted")
            .AddEnvironment(name, environmentKey);

    [Fact]
    public void Update_TrimsName_KeepsKeyWhenNull()
    {
        var env = CreateEnvironment();

        env.Update("  Renamed  ", null);

        env.Name.Should().Be("Renamed");
        env.EnvironmentKey.Should().Be("dev");
    }

    [Fact]
    public void Update_NullName_KeepsName()
    {
        var env = CreateEnvironment();

        env.Update(null, "new-key");

        env.Name.Should().Be("Dev");
        env.EnvironmentKey.Should().Be("new-key");
    }

    [Fact]
    public void Update_WhitespaceKey_ClearsKey()
    {
        var env = CreateEnvironment();

        env.Update(null, "   ");

        env.EnvironmentKey.Should().BeNull();
    }

    [Fact]
    public void SetProtection_TogglesFlag()
    {
        var env = CreateEnvironment();

        env.SetProtection(true);
        env.IsProtected.Should().BeTrue();

        env.SetProtection(false);
        env.IsProtected.Should().BeFalse();
    }
}
