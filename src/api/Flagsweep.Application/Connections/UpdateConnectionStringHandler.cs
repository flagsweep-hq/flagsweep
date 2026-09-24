namespace Flagsweep.Application.Connections;

public record UpdateConnectionStringRequest(string ConnectionString);

public record UpdateConnectionStringCommand(int Id, UpdateConnectionStringRequest Request)
    : IRequest<Result>;

public class UpdateConnectionStringCommandValidator
    : AbstractValidator<UpdateConnectionStringCommand>
{
    public UpdateConnectionStringCommandValidator()
    {
        RuleFor(x => x.Request.ConnectionString).ValidConnectionString();
    }
}

public class UpdateConnectionStringHandler(
    IFlagsweepDbContext db,
    IConnectionStringProtector protector
) : IRequestHandler<UpdateConnectionStringCommand, Result>
{
    public async Task<Result> HandleAsync(
        UpdateConnectionStringCommand command,
        CancellationToken ct = default
    )
    {
        var connection = await db.Connections.FindAsync([command.Id], ct);
        if (connection is null)
            return ConnectionErrors.NotFound(command.Id);

        var connectionString = command.Request.ConnectionString.Trim();
        var endpoint = StoreEndpoint.Parse(connectionString)!;
        var existing = await ConnectionQueries.ConnectionNameForEndpointAsync(
            db,
            endpoint,
            connection.Id,
            ct
        );
        if (existing is not null)
            return ConnectionErrors.StoreAlreadyConnected(existing);

        connection.SetConnectionString(endpoint, protector.Protect(connectionString));
        await db.SaveChangesAsync(ct);
        return Result.Ok();
    }
}
