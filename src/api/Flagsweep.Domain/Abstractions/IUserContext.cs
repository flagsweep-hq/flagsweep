namespace Flagsweep.Domain.Abstractions;

public interface IUserContext
{
    string? UserId { get; }
    string? Role { get; }
    bool IsAuthenticated { get; }
    bool IsAdmin { get; }
}
