using ConnectionEntity = Flagsweep.Domain.Models.Connection;

namespace Flagsweep.Application.Connections;

public record ConnectionDto(
    int Id,
    string Name,
    string ProviderType,
    string Endpoint,
    DateTime CreatedAt,
    List<EnvironmentDto> Environments
)
{
    public static ConnectionDto FromEntity(ConnectionEntity connection) =>
        new(
            connection.Id,
            connection.Name,
            connection.ProviderType.ToString(),
            connection.Endpoint,
            connection.CreatedAt,
            connection
                .Environments.OrderBy(e => e.SortOrder)
                .Select(EnvironmentDto.FromEntity)
                .ToList()
        );
}

public record EnvironmentDto(
    int Id,
    string Name,
    string? EnvironmentKey,
    int SortOrder,
    bool IsProtected
)
{
    public static EnvironmentDto FromEntity(ConnectionEnvironment e) =>
        new(e.Id, e.Name, e.EnvironmentKey, e.SortOrder, e.IsProtected);
}

public record CreateEnvironmentRequest(string Name, string? EnvironmentKey);
