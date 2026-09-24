using InvitationEntity = Flagsweep.Domain.Models.Invitation;

namespace Flagsweep.Application.Users;

public record InvitationDto(
    int Id,
    string Email,
    string Role,
    string Token,
    DateTime ExpiresAt,
    DateTime CreatedAt
)
{
    public static InvitationDto FromEntity(InvitationEntity inv) =>
        new(inv.Id, inv.Email, inv.Role, inv.Token, inv.ExpiresAt, inv.CreatedAt);
}
