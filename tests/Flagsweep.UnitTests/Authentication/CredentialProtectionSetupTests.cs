using System.Security.Cryptography;
using Flagsweep.Domain.Abstractions;
using Flagsweep.Infrastructure.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Flagsweep.UnitTests.Authentication;

public sealed class CredentialProtectionSetupTests : IDisposable
{
    private const string ConnectionString = "Endpoint=https://store.azconfig.io;Id=a;Secret=b";
    private const string SecretKey = "correct-horse-battery-staple-and-then-some-more";
    private const string OtherSecretKey = "a-different-key-that-is-also-long-enough-to-pass";

    private readonly string _root = Path.Combine(
        Path.GetTempPath(),
        $"flagsweep-dp-{Guid.NewGuid():N}"
    );

    public void Dispose()
    {
        if (Directory.Exists(_root))
            Directory.Delete(_root, recursive: true);
    }

    private ServiceProvider BuildServices(params (string Key, string? Value)[] settings)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(
                settings
                    .Append((Key: "DataProtection:KeyRingPath", Value: Path.Combine(_root, "keys")))
                    .Select(s => new KeyValuePair<string, string?>(s.Key, s.Value))
            )
            .Build();

        var environment = Substitute.For<IHostEnvironment>();
        environment.ContentRootPath.Returns(_root);

        return new ServiceCollection()
            .AddCredentialProtection(environment, configuration)
            .BuildServiceProvider();
    }

    private IConnectionStringProtector BuildProtector(
        params (string Key, string? Value)[] settings
    ) => BuildServices(settings).GetRequiredService<IConnectionStringProtector>();

    private string WriteFile(string content)
    {
        Directory.CreateDirectory(_root);
        var path = Path.Combine(_root, $"{Guid.NewGuid():N}.txt");
        File.WriteAllText(path, content);
        return path;
    }

    private static (string, string?) Key(string secretKey) =>
        ("DataProtection:SecretKey", secretKey);

    [Fact]
    public void WithoutAKey_ConnectionStringsAreStoredAsEntered()
    {
        var services = BuildServices();
        var protector = services.GetRequiredService<IConnectionStringProtector>();

        protector.Protect(ConnectionString).Should().Be(ConnectionString);
        protector.Unprotect(ConnectionString).Should().Be(ConnectionString);
        services.GetRequiredService<CredentialProtectionStatus>().KeyFingerprint.Should().BeNull();
    }

    [Fact]
    public void WithoutAKey_AnEncryptedValueIsRefusedRatherThanUsedAsAConnectionString()
    {
        var encrypted = BuildProtector(Key(SecretKey)).Protect(ConnectionString);

        var act = () => BuildProtector().Unprotect(encrypted);

        act.Should().Throw<CredentialProtectionException>().WithMessage("*none is configured*");
    }

    [Fact]
    public void WithAKey_ProtectedValueSurvivesAHostRestart()
    {
        var stored = BuildProtector(Key(SecretKey)).Protect(ConnectionString);
        var afterRestart = BuildProtector(Key(SecretKey)).Unprotect(stored);

        stored.Should().StartWith("enc:v1:").And.NotContain("Secret=b");
        afterRestart.Should().Be(ConnectionString);
    }

    [Fact]
    public void WithAKey_EachValueIsEncryptedDifferently()
    {
        var protector = BuildProtector(Key(SecretKey));

        protector.Protect(ConnectionString).Should().NotBe(protector.Protect(ConnectionString));
    }

    [Fact]
    public void WithAKey_ATamperedValueIsRejected()
    {
        var protector = BuildProtector(Key(SecretKey));
        var stored = protector.Protect(ConnectionString);
        var tampered = stored[..^4] + (stored[^4] == 'A' ? "BAAA" : "AAAA");

        var act = () => protector.Unprotect(tampered);

        act.Should().Throw<CryptographicException>();
    }

    [Fact]
    public void WithAKey_PlainTextFromBeforeItWasConfiguredStillReads()
    {
        BuildProtector(Key(SecretKey)).Unprotect(ConnectionString).Should().Be(ConnectionString);
    }

    [Fact]
    public void WithAKey_TheStatusCarriesAFingerprintNotTheKey()
    {
        var status = BuildServices(Key(SecretKey)).GetRequiredService<CredentialProtectionStatus>();

        status.KeyFingerprint.Should().HaveLength(8);
        SecretKey.Should().NotContain(status.KeyFingerprint);
    }

    [Fact]
    public void Key_CanComeFromASecretFile()
    {
        var protector = BuildProtector(
            ("DataProtection:SecretKeyFile", WriteFile(SecretKey + "\n"))
        );

        protector
            .Unprotect(BuildProtector(Key(SecretKey)).Protect(ConnectionString))
            .Should()
            .Be(ConnectionString);
    }

    [Fact]
    public void Rotation_APreviousKeyStillDecrypts_AndTheCurrentOneEncrypts()
    {
        var stored = BuildProtector(Key(SecretKey)).Protect(ConnectionString);

        var rotated = (SecretKeyConnectionStringProtector)BuildProtector(
            Key(OtherSecretKey),
            ("DataProtection:PreviousSecretKeys:0", SecretKey)
        );

        rotated.Unprotect(stored).Should().Be(ConnectionString);
        rotated.UsesCurrentKey(stored).Should().BeFalse();
        rotated.UsesCurrentKey(rotated.Protect(ConnectionString)).Should().BeTrue();
    }

    [Fact]
    public void Rotation_APreviousKeyCanComeFromAFile()
    {
        var stored = BuildProtector(Key(SecretKey)).Protect(ConnectionString);

        var rotated = BuildProtector(
            Key(OtherSecretKey),
            ("DataProtection:PreviousSecretKeyFiles:0", WriteFile(SecretKey))
        );

        rotated.Unprotect(stored).Should().Be(ConnectionString);
    }

    [Fact]
    public void Rotation_WithoutThePreviousKey_OldValuesCannotBeDecrypted()
    {
        var stored = BuildProtector(Key(SecretKey)).Protect(ConnectionString);

        var act = () => BuildProtector(Key(OtherSecretKey)).Unprotect(stored);

        act.Should().Throw<CryptographicException>();
    }

    [Theory]
    [InlineData("short")]
    [InlineData("exactly-thirty-one-characters!!")]
    public void Startup_Fails_WhenTheKeyIsTooShort(string key)
    {
        var act = () => BuildServices(Key(key));

        act.Should().Throw<CredentialProtectionException>().WithMessage("*at least 32 characters*");
    }

    [Fact]
    public void Startup_Fails_WhenTheKeyFileIsMissing()
    {
        var act = () =>
            BuildServices(("DataProtection:SecretKeyFile", Path.Combine(_root, "missing.txt")));

        act.Should().Throw<CredentialProtectionException>().WithMessage("*does not exist*");
    }

    [Fact]
    public void Startup_Fails_WhenBothKeyAndKeyFileAreSet()
    {
        var act = () =>
            BuildServices(Key(SecretKey), ("DataProtection:SecretKeyFile", WriteFile(SecretKey)));

        act.Should().Throw<CredentialProtectionException>().WithMessage("*only one of*");
    }

    [Fact]
    public void Startup_Fails_WhenOnlyPreviousKeysAreConfigured()
    {
        var act = () => BuildServices(("DataProtection:PreviousSecretKeys:0", SecretKey));

        act.Should().Throw<CredentialProtectionException>().WithMessage("*current key*");
    }

    [Fact]
    public void Startup_Fails_WhenAPreviousKeyIsTooShort()
    {
        var act = () =>
            BuildServices(Key(SecretKey), ("DataProtection:PreviousSecretKeys:0", "short"));

        act.Should().Throw<CredentialProtectionException>().WithMessage("*previous secret key*");
    }
}
