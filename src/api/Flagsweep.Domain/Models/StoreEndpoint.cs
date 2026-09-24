namespace Flagsweep.Domain.Models;

public static class StoreEndpoint
{
    public const int MaxLength = 500;

    public static string? Parse(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return null;

        foreach (var part in connectionString.Split(';'))
        {
            var trimmed = part.Trim();
            if (!trimmed.StartsWith("Endpoint=", StringComparison.OrdinalIgnoreCase))
                continue;

            if (
                !Uri.TryCreate(trimmed["Endpoint=".Length..].Trim(), UriKind.Absolute, out var uri)
                || uri.Scheme is not ("http" or "https")
            )
                return null;

            var normalized = uri.GetLeftPart(UriPartial.Path).TrimEnd('/').ToLowerInvariant();
            return normalized.Length <= MaxLength ? normalized : null;
        }

        return null;
    }
}
