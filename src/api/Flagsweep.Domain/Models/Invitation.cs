using System.Security.Cryptography;

namespace Flagsweep.Domain.Models;

public class Invitation : IAuditable
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = Roles.Member;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; private set; }
    public string? CreatedById { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? UpdatedById { get; private set; }

    public static Invitation Create(
        string email,
        string role,
        DateTime utcNow,
        int expirationDays = 7
    )
    {
        var token = Convert
            .ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');

        return new Invitation
        {
            Email = email.ToLowerInvariant(),
            Role = role,
            Token = token,
            ExpiresAt = utcNow.AddDays(expirationDays),
        };
    }
}
