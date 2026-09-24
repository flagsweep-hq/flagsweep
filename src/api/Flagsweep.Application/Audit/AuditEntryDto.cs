using System.Text.Json;

namespace Flagsweep.Application.Audit;

public record AuditEntryDto(
    int Id,
    int ConnectionId,
    int EnvironmentId,
    string TriggeredById,
    string TriggeredByEmail,
    List<FlagChange> Changes,
    DateTime CreatedAt
)
{
    public static AuditEntryDto FromEntity(AuditEntry entry, string userEmail)
    {
        List<FlagChange> changes;
        try
        {
            changes = JsonSerializer.Deserialize<List<FlagChange>>(entry.ChangesJson) ?? [];
        }
        catch (JsonException)
        {
            changes = [];
        }

        return new AuditEntryDto(
            entry.Id,
            entry.ConnectionId,
            entry.EnvironmentId,
            entry.TriggeredById,
            userEmail,
            changes,
            entry.CreatedAt
        );
    }
}
