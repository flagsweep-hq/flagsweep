namespace Flagsweep.Infrastructure.Authentication;

public sealed class PlainTextConnectionStringProtector : IConnectionStringProtector
{
    public string Protect(string plainText) => plainText;

    public string Unprotect(string protectedText) =>
        SecretKeyConnectionStringProtector.IsEncrypted(protectedText)
            ? throw new CredentialProtectionException(
                "This connection string was encrypted with a secret key, but none is configured. "
                    + $"Set {DataProtectionOptions.SectionName}:SecretKey to the key it was "
                    + "encrypted with, or enter the connection string again."
            )
            : protectedText;
}
