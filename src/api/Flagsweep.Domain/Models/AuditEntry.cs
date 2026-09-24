using System.Text.Json;
using System.Text.Json.Serialization;

namespace Flagsweep.Domain.Models;

public class AuditEntry : IAuditable
{
    public int Id { get; private set; }
    public int ConnectionId { get; private set; }
    public int EnvironmentId { get; private set; }
    public string TriggeredById { get; private set; } = string.Empty;
    public string ChangesJson { get; private set; } = "[]";

    public DateTimeOffset? ProviderTimestamp { get; private set; }

    public DateTime CreatedAt { get; private set; }
    public string? CreatedById { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? UpdatedById { get; private set; }

    public Connection Connection { get; private set; } = null!;
    public ConnectionEnvironment Environment { get; private set; } = null!;

    private AuditEntry() { }

    public static AuditEntry Create(
        int connectionId,
        int environmentId,
        string triggeredById,
        IEnumerable<FlagChange> changes,
        DateTimeOffset? providerTimestamp = null
    )
    {
        return new AuditEntry
        {
            ConnectionId = connectionId,
            EnvironmentId = environmentId,
            TriggeredById = triggeredById,
            ChangesJson = JsonSerializer.Serialize(changes),
            ProviderTimestamp = providerTimestamp,
        };
    }
}

public record FlagChange(
    string FlagId,
    [property: JsonConverter(typeof(FlagChangeFieldJsonConverter))] FlagChangeField Field,
    string? From,
    string? To
);

public enum FlagChangeField
{
    Created,
    Deleted,
    Locked,
    Enabled,
    DisplayName,
    Description,
    IsPermanent,
    ExpiresAt,
}

public sealed class FlagChangeFieldJsonConverter()
    : JsonStringEnumConverter<FlagChangeField>(JsonNamingPolicy.CamelCase);
