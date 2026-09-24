namespace Flagsweep.Application.Users;

public record UserDto(
    string Id,
    string Email,
    string Role,
    DateTime CreatedAt,
    bool IsDeleted = false,
    DateTime? DeletedAt = null
)
{
    public static UserDto FromEntity(ApplicationUser user) =>
        new(user.Id, user.Email!, user.Role, user.CreatedAt, user.IsDeleted, user.DeletedAt);
}
