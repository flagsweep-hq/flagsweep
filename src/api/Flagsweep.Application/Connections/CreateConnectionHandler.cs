namespace Flagsweep.Application.Connections;

public record CreateConnectionRequest(
    string Name,
    ProviderType ProviderType,
    string ConnectionString,
    List<CreateEnvironmentRequest>? Environments
) : IRequest<Result<ConnectionDto>>;

public class CreateConnectionHandler(IFlagsweepDbContext db, IConnectionStringProtector protector)
    : IRequestHandler<CreateConnectionRequest, Result<ConnectionDto>>
{
    public async Task<Result<ConnectionDto>> HandleAsync(
        CreateConnectionRequest req,
        CancellationToken ct = default
    )
    {
        var endpoint = StoreEndpoint.Parse(req.ConnectionString)!;
        var existing = await ConnectionQueries.ConnectionNameForEndpointAsync(
            db,
            endpoint,
            null,
            ct
        );
        if (existing is not null)
            return ConnectionErrors.StoreAlreadyConnected(existing);

        var connection = Connection.Create(
            req.Name,
            req.ProviderType,
            endpoint,
            protector.Protect(req.ConnectionString.Trim())
        );

        foreach (var env in req.Environments ?? [])
            connection.AddEnvironment(env.Name, env.EnvironmentKey);

        db.Connections.Add(connection);
        await db.SaveChangesAsync(ct);

        return ConnectionDto.FromEntity(connection);
    }
}

public class CreateConnectionRequestValidator : AbstractValidator<CreateConnectionRequest>
{
    public CreateConnectionRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.ProviderType).IsInEnum();
        RuleFor(x => x.ConnectionString).ValidConnectionString();
        RuleForEach(x => x.Environments).SetValidator(new CreateEnvironmentRequestValidator());
    }
}
