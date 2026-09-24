namespace Flagsweep.Infrastructure.Authentication;

public sealed class CredentialProtectionException(string message, Exception? inner = null)
    : InvalidOperationException(message, inner);
