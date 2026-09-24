namespace Flagsweep.Application.Connections;

internal static class ConnectionErrors
{
    internal static Error NotFound(int id) => Error.NotFound($"Connection {id} not found.");

    internal static Error NotFoundOrEmpty(int id) =>
        Error.NotFound($"Connection {id} not found or has no environments.");

    internal static Error EnvironmentNotFound(int environmentId) =>
        Error.NotFound($"Environment {environmentId} not found.");

    internal static Error EnvironmentNotFoundInConnection(int environmentId, int connectionId) =>
        Error.NotFound($"Environment {environmentId} not found in connection {connectionId}.");

    internal static Error EnvironmentNameTaken(string name) =>
        Error.Conflict($"Environment '{name}' already exists in this connection.");

    internal static Error StoreAlreadyConnected(string connectionName) =>
        Error.Conflict($"This store is already connected as '{connectionName}'.");

    internal static Error StoreUnreachable(string message) =>
        Error.Validation($"Could not connect to the store: {message}");
}

internal static class ConnectionRules
{
    internal const string InvalidConnectionStringMessage =
        "Connection string must include a valid Endpoint=https://... part.";

    internal static IRuleBuilderOptions<T, string> ValidConnectionString<T>(
        this IRuleBuilder<T, string> rule
    ) =>
        rule.NotEmpty()
            .WithMessage("A connection string is required.")
            .MaximumLength(1000)
            .Must(cs => StoreEndpoint.Parse(cs) is not null)
            .WithMessage(InvalidConnectionStringMessage);
}

internal static class ConnectionQueries
{
    internal static Task<string?> ConnectionNameForEndpointAsync(
        IFlagsweepDbContext db,
        string endpoint,
        int? excludeId,
        CancellationToken ct
    ) =>
        db
            .Connections.Where(p =>
                p.Endpoint == endpoint && (excludeId == null || p.Id != excludeId)
            )
            .Select(p => p.Name)
            .FirstOrDefaultAsync(ct);

    internal static Task<ConnectionEnvironment?> FindEnvironmentAsync(
        IFlagsweepDbContext db,
        int connectionId,
        int environmentId,
        CancellationToken ct
    ) =>
        db.Environments.FirstOrDefaultAsync(
            e => e.Id == environmentId && e.ConnectionId == connectionId,
            ct
        );
}
