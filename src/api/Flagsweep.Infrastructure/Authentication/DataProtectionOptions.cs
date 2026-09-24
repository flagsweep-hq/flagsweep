using Microsoft.Extensions.Configuration;

namespace Flagsweep.Infrastructure.Authentication;

public sealed record DataProtectionOptions(
    string? KeyRingPath,
    string? SecretKey,
    IReadOnlyList<string> PreviousSecretKeys
)
{
    public const string SectionName = "DataProtection";
    public const int MinimumSecretKeyLength = 32;

    public static DataProtectionOptions Resolve(IConfiguration configuration)
    {
        var section = configuration.GetSection(SectionName);
        var secretKey = ResolveSecretKey(section);
        var previous = section
            .GetSection("PreviousSecretKeys")
            .GetChildren()
            .Select(child => child.Value)
            .Concat(
                section
                    .GetSection("PreviousSecretKeyFiles")
                    .GetChildren()
                    .Select(child => ReadSecretKeyFile(child.Path, child.Value))
            )
            .Select(NullIfBlank)
            .OfType<string>()
            .ToList();

        if (secretKey is null && previous.Count > 0)
            throw new CredentialProtectionException(
                $"{SectionName}:PreviousSecretKeys is set but {SectionName}:SecretKey is not. "
                    + "Previous keys only decrypt; configure the current key too."
            );
        foreach (var key in previous.Where(TooShort))
            throw new CredentialProtectionException(
                $"A previous secret key is shorter than {MinimumSecretKeyLength} characters, so "
                    + "it cannot be one Flagsweep ever accepted. Check the configuration."
            );

        return new DataProtectionOptions(
            KeyRingPath: NullIfBlank(section["KeyRingPath"]),
            SecretKey: secretKey,
            PreviousSecretKeys: previous
        );
    }

    private static string? ResolveSecretKey(IConfigurationSection section)
    {
        var inline = NullIfBlank(section["SecretKey"]);
        var file = NullIfBlank(section["SecretKeyFile"]);
        if (inline is not null && file is not null)
            throw new CredentialProtectionException(
                $"Set only one of {SectionName}:SecretKey and {SectionName}:SecretKeyFile."
            );

        var key = inline ?? NullIfBlank(ReadSecretKeyFile($"{SectionName}:SecretKeyFile", file));
        if (key is null)
            return null;
        if (TooShort(key))
            throw new CredentialProtectionException(
                $"{SectionName}:SecretKey must be at least {MinimumSecretKeyLength} characters. "
                    + "Generate one with: openssl rand -base64 48"
            );
        return key;
    }

    private static bool TooShort(string key) => key.Length < MinimumSecretKeyLength;

    private static string? ReadSecretKeyFile(string setting, string? path)
    {
        if (path is null)
            return null;
        if (!File.Exists(path))
            throw new CredentialProtectionException(
                $"{setting}: file '{path}' does not exist or is not readable."
            );
        try
        {
            return File.ReadAllText(path).TrimEnd('\r', '\n');
        }
        catch (Exception ex) when (ex is UnauthorizedAccessException or IOException)
        {
            throw new CredentialProtectionException(
                $"{setting}: file '{path}' cannot be read. Check the file permissions: the "
                    + $"Flagsweep container runs as uid 1654 ({ex.Message}).",
                ex
            );
        }
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value;
}
