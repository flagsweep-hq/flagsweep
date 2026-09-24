namespace Flagsweep.Domain.Models;

public class FlagOwner : IAuditable
{
    public int Id { get; private set; }
    public int ConnectionId { get; private set; }
    public string FlagId { get; private set; } = string.Empty;
    public string UserId { get; private set; } = string.Empty;

    public DateTime CreatedAt { get; private set; }
    public string? CreatedById { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? UpdatedById { get; private set; }

    public Connection Connection { get; private set; } = null!;

    private FlagOwner() { }

    public FlagOwner(int connectionId, string flagId, string userId)
    {
        ConnectionId = connectionId;
        FlagId = flagId;
        UserId = userId;
    }

    public void Reassign(string userId) => UserId = userId;
}
