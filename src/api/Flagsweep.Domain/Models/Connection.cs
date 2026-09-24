namespace Flagsweep.Domain.Models;

public class Connection : IAuditable
{
    private readonly List<ConnectionEnvironment> _environments = [];

    public int Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public ProviderType ProviderType { get; private set; }

    public string Endpoint { get; private set; } = string.Empty;

    public string ConnectionString { get; private set; } = string.Empty;
    public DateTime CreatedAt { get; private set; }
    public string? CreatedById { get; private set; }
    public DateTime? UpdatedAt { get; private set; }
    public string? UpdatedById { get; private set; }
    public IReadOnlyList<ConnectionEnvironment> Environments => _environments;

    private Connection() { }

    public static Connection Create(
        string name,
        ProviderType providerType,
        string endpoint,
        string protectedConnectionString
    )
    {
        var connection = new Connection { Name = NormalizeName(name), ProviderType = providerType };
        connection.SetConnectionString(endpoint, protectedConnectionString);
        return connection;
    }

    public void Update(string name)
    {
        Name = NormalizeName(name);
    }

    public void SetConnectionString(string endpoint, string protectedConnectionString)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(endpoint);
        ArgumentException.ThrowIfNullOrWhiteSpace(protectedConnectionString);
        Endpoint = endpoint;
        ConnectionString = protectedConnectionString;
    }

    public ConnectionEnvironment AddEnvironment(string name, string? environmentKey)
    {
        var maxSortOrder = _environments.Count > 0 ? _environments.Max(e => e.SortOrder) : -1;

        var env = new ConnectionEnvironment(name, environmentKey, maxSortOrder + 1);
        _environments.Add(env);
        return env;
    }

    public bool HasEnvironmentNamed(string name) =>
        _environments.Any(e =>
            e.Name.Equals(NormalizeName(name), StringComparison.OrdinalIgnoreCase)
        );

    public void ReorderEnvironments(IReadOnlyList<int> environmentIds)
    {
        for (var i = 0; i < environmentIds.Count; i++)
        {
            var env = _environments.FirstOrDefault(e => e.Id == environmentIds[i]);
            env?.SetSortOrder(i);
        }
    }

    public static string NormalizeName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return name.Trim();
    }
}
