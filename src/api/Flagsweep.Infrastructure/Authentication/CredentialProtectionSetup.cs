using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Flagsweep.Infrastructure.Authentication;

public static class CredentialProtectionSetup
{
    public static IServiceCollection AddCredentialProtection(
        this IServiceCollection services,
        IHostEnvironment environment,
        IConfiguration configuration
    )
    {
        var options = DataProtectionOptions.Resolve(configuration);
        var keyRingPath =
            options.KeyRingPath ?? Path.Combine(environment.ContentRootPath, "data", "keys");
        CreatePrivateDirectory(keyRingPath);

        services
            .AddDataProtection()
            .SetApplicationName("Flagsweep")
            .PersistKeysToFileSystem(new DirectoryInfo(keyRingPath));

        if (options.SecretKey is null)
        {
            services.AddSingleton(new CredentialProtectionStatus(KeyFingerprint: null));
            services.AddSingleton<IConnectionStringProtector, PlainTextConnectionStringProtector>();
            return services;
        }

        var protector = new SecretKeyConnectionStringProtector(
            options.SecretKey,
            options.PreviousSecretKeys
        );
        services.AddSingleton(new CredentialProtectionStatus(protector.KeyFingerprint));
        services.AddSingleton<IConnectionStringProtector>(protector);
        return services;
    }

    private static void CreatePrivateDirectory(string path)
    {
        if (OperatingSystem.IsWindows())
        {
            Directory.CreateDirectory(path);
            return;
        }

        Directory.CreateDirectory(
            path,
            UnixFileMode.UserRead | UnixFileMode.UserWrite | UnixFileMode.UserExecute
        );
    }
}
