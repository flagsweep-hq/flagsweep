using System.Security.Cryptography;
using System.Text;

namespace Flagsweep.Infrastructure.Authentication;

public sealed class SecretKeyConnectionStringProtector : IConnectionStringProtector
{
    private const string Prefix = "enc:v1:";
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private static readonly byte[] Purpose = Encoding.UTF8.GetBytes(
        "Flagsweep.ConnectionStrings.v1"
    );

    private readonly byte[] _currentKey;
    private readonly byte[][] _previousKeys;

    public SecretKeyConnectionStringProtector(
        string secretKey,
        IEnumerable<string> previousSecretKeys
    )
    {
        _currentKey = DeriveKey(secretKey);
        _previousKeys = previousSecretKeys.Select(DeriveKey).ToArray();
        KeyFingerprint = Fingerprint(secretKey);
    }

    public string KeyFingerprint { get; }

    public static bool IsEncrypted(string storedValue) =>
        storedValue.StartsWith(Prefix, StringComparison.Ordinal);

    public string Protect(string plainText)
    {
        var plainBytes = Encoding.UTF8.GetBytes(plainText);
        var payload = new byte[NonceSize + plainBytes.Length + TagSize];
        var nonce = payload.AsSpan(0, NonceSize);
        var cipher = payload.AsSpan(NonceSize, plainBytes.Length);
        var tag = payload.AsSpan(NonceSize + plainBytes.Length, TagSize);

        RandomNumberGenerator.Fill(nonce);
        using var aes = new AesGcm(_currentKey, TagSize);
        aes.Encrypt(nonce, plainBytes, cipher, tag, Purpose);
        return Prefix + Convert.ToBase64String(payload);
    }

    public string Unprotect(string protectedText)
    {
        if (!IsEncrypted(protectedText))
            return protectedText;
        if (TryUnprotect(protectedText, _currentKey, out var plainText))
            return plainText;
        foreach (var key in _previousKeys)
            if (TryUnprotect(protectedText, key, out plainText))
                return plainText;

        throw new CryptographicException(
            "The connection string was not encrypted with the configured secret key or any of "
                + "the previous ones."
        );
    }

    public bool UsesCurrentKey(string protectedText) =>
        IsEncrypted(protectedText) && TryUnprotect(protectedText, _currentKey, out _);

    private static bool TryUnprotect(string protectedText, byte[] key, out string plainText)
    {
        plainText = string.Empty;
        byte[] payload;
        try
        {
            payload = Convert.FromBase64String(protectedText[Prefix.Length..]);
        }
        catch (FormatException)
        {
            return false;
        }
        if (payload.Length < NonceSize + TagSize)
            return false;

        var nonce = payload.AsSpan(0, NonceSize);
        var cipher = payload.AsSpan(NonceSize, payload.Length - NonceSize - TagSize);
        var tag = payload.AsSpan(payload.Length - TagSize, TagSize);
        var plainBytes = new byte[cipher.Length];
        try
        {
            using var aes = new AesGcm(key, TagSize);
            aes.Decrypt(nonce, cipher, tag, plainBytes, Purpose);
        }
        catch (AuthenticationTagMismatchException)
        {
            return false;
        }
        plainText = Encoding.UTF8.GetString(plainBytes);
        return true;
    }

    private static byte[] DeriveKey(string secretKey) =>
        HKDF.DeriveKey(
            HashAlgorithmName.SHA256,
            ikm: Encoding.UTF8.GetBytes(secretKey),
            outputLength: 32,
            salt: null,
            info: Purpose
        );

    private static string Fingerprint(string secretKey) =>
        Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(secretKey)))[..8];
}
