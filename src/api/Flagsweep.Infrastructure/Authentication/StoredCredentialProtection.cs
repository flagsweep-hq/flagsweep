using System.Security.Cryptography;
using Flagsweep.Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Flagsweep.Infrastructure.Authentication;

public static class StoredCredentialProtection
{
    public static IServiceProvider ProtectStoredCredentials(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var provider = scope.ServiceProvider;
        var logger = provider
            .GetRequiredService<ILoggerFactory>()
            .CreateLogger(typeof(StoredCredentialProtection).FullName!);
        var status = provider.GetRequiredService<CredentialProtectionStatus>();
        var protector = provider.GetRequiredService<IConnectionStringProtector>();
        var db = provider.GetRequiredService<FlagsweepDbContext>();
        var connections = db.Connections.ToList();

        var legacy = DecryptLegacyValues(connections, provider);
        if (legacy > 0)
        {
            db.SaveChanges();
            logger.LogInformation(
                "Converted {Count} connection string(s) stored by Flagsweep v0.1.0.",
                legacy
            );
        }

        if (status.KeyFingerprint is null)
        {
            logger.LogWarning(
                "Connection strings are stored in PLAIN TEXT: no secret key is configured. "
                    + "Set DataProtection__SecretKey to encrypt them."
            );
            foreach (var connection in connections.Where(IsEncrypted))
                logger.LogError(
                    "Connection '{Connection}' has an encrypted connection string, but no secret key is "
                        + "configured. Restore the key, or enter the connection string again in the "
                        + "connection's settings.",
                    connection.Name
                );
            return services;
        }

        logger.LogInformation(
            "Connection strings are encrypted with secret key {Fingerprint}.",
            status.KeyFingerprint
        );

        var secretKeyProtector = (SecretKeyConnectionStringProtector)protector;
        var toEncrypt = new List<Connection>();
        foreach (var connection in connections)
        {
            if (secretKeyProtector.UsesCurrentKey(connection.ConnectionString))
                continue;
            try
            {
                connection.SetConnectionString(
                    connection.Endpoint,
                    protector.Unprotect(connection.ConnectionString)
                );
                toEncrypt.Add(connection);
            }
            catch (CryptographicException ex)
            {
                throw new CredentialProtectionException(
                    $"The configured secret key cannot decrypt the connection string of connection "
                        + $"'{connection.Name}'. It was encrypted with a different key: configure that "
                        + "one, or list it under DataProtection:PreviousSecretKeys so it can be "
                        + "re-encrypted with the current key.",
                    ex
                );
            }
        }

        foreach (var connection in toEncrypt)
            connection.SetConnectionString(
                connection.Endpoint,
                protector.Protect(connection.ConnectionString)
            );
        if (toEncrypt.Count > 0)
        {
            db.SaveChanges();
            logger.LogInformation(
                "Encrypted {Count} connection string(s) with the current secret key.",
                toEncrypt.Count
            );
        }

        return services;
    }

    private static int DecryptLegacyValues(List<Connection> connections, IServiceProvider provider)
    {
        const string dataProtectionPayloadStart = "CfDJ8";
        var legacy = connections
            .Where(p =>
                p.ConnectionString.StartsWith(dataProtectionPayloadStart, StringComparison.Ordinal)
            )
            .ToList();
        if (legacy.Count == 0)
            return 0;

        var legacyProtector = provider
            .GetRequiredService<IDataProtectionProvider>()
            .CreateProtector("Flagsweep.ConnectionStrings");
        var converted = 0;
        foreach (var connection in legacy)
        {
            try
            {
                connection.SetConnectionString(
                    connection.Endpoint,
                    legacyProtector.Unprotect(connection.ConnectionString)
                );
                converted++;
            }
            catch (CryptographicException) { }
        }
        return converted;
    }

    private static bool IsEncrypted(Connection connection) =>
        SecretKeyConnectionStringProtector.IsEncrypted(connection.ConnectionString);
}
