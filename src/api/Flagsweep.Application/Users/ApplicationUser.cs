namespace Flagsweep.Application.Users;

public class ApplicationUser : IdentityUser, IAuditable, ISoftDeletable
{
    public string Role { get; set; } = Roles.Member;
    public DateTime CreatedAt { get; private set; }
    public string? CreatedById { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? UpdatedById { get; private set; }

    public bool IsDeleted { get; private set; }
    public DateTime? DeletedAt { get; private set; }

    public void Restore()
    {
        IsDeleted = false;
        DeletedAt = null;
    }
}
