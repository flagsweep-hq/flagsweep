using System.ComponentModel.DataAnnotations.Schema;

namespace Flagsweep.Domain.Models;

public class ConnectionEnvironment : IAuditable
{
    public int Id { get; private set; }
    public int ConnectionId { get; private set; }
    public string Name { get; private set; } = string.Empty;

    [Column("AzureLabel")]
    public string? EnvironmentKey { get; private set; }
    public int SortOrder { get; private set; }
    public bool IsProtected { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public string? CreatedById { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? UpdatedById { get; private set; }
    public Connection Connection { get; private set; } = null!;

    private ConnectionEnvironment() { }

    internal ConnectionEnvironment(string name, string? environmentKey, int sortOrder)
    {
        Name = Connection.NormalizeName(name);
        EnvironmentKey = NormalizeEnvironmentKey(environmentKey);
        SortOrder = sortOrder;
    }

    public void Update(string? name, string? environmentKey)
    {
        if (name is not null)
            Name = Connection.NormalizeName(name);
        if (environmentKey is not null)
            EnvironmentKey = NormalizeEnvironmentKey(environmentKey);
    }

    public void SetProtection(bool isProtected) => IsProtected = isProtected;

    internal void SetSortOrder(int sortOrder) => SortOrder = sortOrder;

    private static string? NormalizeEnvironmentKey(string? environmentKey)
    {
        var trimmed = environmentKey?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
