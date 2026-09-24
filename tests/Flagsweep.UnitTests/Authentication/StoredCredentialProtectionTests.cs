using Flagsweep.Domain.Abstractions;
using Flagsweep.Domain.Models;
using Flagsweep.Infrastructure.Authentication;
using Flagsweep.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Flagsweep.UnitTests.Authentication;

public sealed class StoredCredentialProtectionTests : IDisposable
{
    private const string ConnectionString = "Endpoint=https://store.azconfig.io;Id=a;Secret=b";

    private readonly string _root = Path.Combine(
        Path.GetTempPath(),
        $"flagsweep-dp-{Guid.NewGuid():N}"
    );
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    private const string SecretKey = "correct-horse-battery-staple-and-then-some-more";
    private const string OtherSecretKey = "a-different-key-that-is-also-long-enough-to-pass";

    public StoredCredentialProtectionTests()
    {
        _connection.Open();
    }

    public void Dispose()
    {
        _connection.Dispose();
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }

    private ServiceProvider StartHost(string? secretKey, string? previousSecretKey = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection([
                new("DataProtection:KeyRingPath", Path.Combine(_root, "keys")),
                new("DataProtection:SecretKey", secretKey),
                new("DataProtection:PreviousSecretKeys:0", previousSecretKey),
            ])
            .Build();
        var environment = Substitute.For<IHostEnvironment>();
        environment.ContentRootPath.Returns(_root);

        var services = new ServiceCollection()
            .AddLogging()
            .AddDbContext<FlagsweepDbContext>(options => options.UseSqlite(_connection))
            .AddCredentialProtection(environment, configuration)
            .BuildServiceProvider();

        using var scope = services.CreateScope();
        scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>().Database.EnsureCreated();
        return services;
    }

    private static void AddConnection(ServiceProvider host, string name, string endpoint)
    {
        using var scope = host.CreateScope();
        var protector = scope.ServiceProvider.GetRequiredService<IConnectionStringProtector>();
        var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();
        db.Connections.Add(
            Connection.Create(
                name,
                ProviderType.Azure,
                endpoint,
                protector.Protect(ConnectionString)
            )
        );
        db.SaveChanges();
    }

    private static string StoredConnectionString(ServiceProvider host, string name)
    {
        using var scope = host.CreateScope();
        return scope
            .ServiceProvider.GetRequiredService<FlagsweepDbContext>()
            .Connections.AsNoTracking()
            .Single(p => p.Name == name)
            .ConnectionString;
    }

    [Fact]
    public void ConfiguringAKey_EncryptsWhatWasStoredInPlainText()
    {
        var withoutKey = StartHost(secretKey: null);
        AddConnection(withoutKey, "Shop", "https://shop.azconfig.io");
        StoredConnectionString(withoutKey, "Shop").Should().Be(ConnectionString);

        var withKey = StartHost(SecretKey);
        withKey.ProtectStoredCredentials();

        var stored = StoredConnectionString(withKey, "Shop");
        stored.Should().StartWith("enc:v1:");
        withKey
            .GetRequiredService<IConnectionStringProtector>()
            .Unprotect(stored)
            .Should()
            .Be(ConnectionString);
    }

    [Fact]
    public void Startup_Fails_WhenTheKeyCannotDecryptWhatIsStored()
    {
        AddConnection(StartHost(SecretKey), "Shop", "https://shop.azconfig.io");

        var act = () => StartHost(OtherSecretKey).ProtectStoredCredentials();

        act.Should()
            .Throw<CredentialProtectionException>()
            .WithMessage("*cannot decrypt the connection string of connection 'Shop'*");
    }

    [Fact]
    public void RemovingTheKey_StartsButLeavesEncryptedValuesUntouched()
    {
        var withKey = StartHost(SecretKey);
        AddConnection(withKey, "Shop", "https://shop.azconfig.io");
        var stored = StoredConnectionString(withKey, "Shop");

        var withoutKey = StartHost(secretKey: null);
        withoutKey.ProtectStoredCredentials();

        StoredConnectionString(withoutKey, "Shop").Should().Be(stored);
    }

    [Fact]
    public void AfterALostKey_ReenteredConnectionStringsAreEncryptedWithTheNewOne()
    {
        AddConnection(StartHost(SecretKey), "Shop", "https://shop.azconfig.io");

        var withoutKey = StartHost(secretKey: null);
        using (var scope = withoutKey.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();
            var connection = db.Connections.Single();
            connection.SetConnectionString(connection.Endpoint, ConnectionString);
            db.SaveChanges();
        }

        var withNewKey = StartHost(OtherSecretKey);
        withNewKey.ProtectStoredCredentials();

        var stored = StoredConnectionString(withNewKey, "Shop");
        stored.Should().StartWith("enc:v1:");
        withNewKey
            .GetRequiredService<IConnectionStringProtector>()
            .Unprotect(stored)
            .Should()
            .Be(ConnectionString);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void UpgradingFromV010_ConvertsWhatItEncryptedWithTheSignInKeyRing(bool withKey)
    {
        var host = StartHost(withKey ? SecretKey : null);
        using (var scope = host.CreateScope())
        {
            var v010Value = scope
                .ServiceProvider.GetRequiredService<IDataProtectionProvider>()
                .CreateProtector("Flagsweep.ConnectionStrings")
                .Protect(ConnectionString);
            var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();
            db.Connections.Add(
                Connection.Create("Shop", ProviderType.Azure, "https://shop.azconfig.io", v010Value)
            );
            db.SaveChanges();
        }

        host.ProtectStoredCredentials();

        var stored = StoredConnectionString(host, "Shop");
        stored.StartsWith("enc:v1:").Should().Be(withKey);
        host.GetRequiredService<IConnectionStringProtector>()
            .Unprotect(stored)
            .Should()
            .Be(ConnectionString);
    }

    [Fact]
    public void RotatingTheKey_ReencryptsWithTheCurrentOne_SoThePreviousCanBeDropped()
    {
        AddConnection(StartHost(SecretKey), "Shop", "https://shop.azconfig.io");

        StartHost(OtherSecretKey, previousSecretKey: SecretKey).ProtectStoredCredentials();

        var afterRotation = StartHost(OtherSecretKey);
        afterRotation.ProtectStoredCredentials();
        afterRotation
            .GetRequiredService<IConnectionStringProtector>()
            .Unprotect(StoredConnectionString(afterRotation, "Shop"))
            .Should()
            .Be(ConnectionString);
    }
}
