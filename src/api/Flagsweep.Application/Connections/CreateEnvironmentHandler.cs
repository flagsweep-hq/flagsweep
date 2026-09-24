namespace Flagsweep.Application.Connections;

public record CreateEnvironmentCommand(int ConnectionId, CreateEnvironmentRequest Request)
    : IRequest<Result<EnvironmentDto>>;

public class CreateEnvironmentHandler(IFlagsweepDbContext db)
    : IRequestHandler<CreateEnvironmentCommand, Result<EnvironmentDto>>
{
    public async Task<Result<EnvironmentDto>> HandleAsync(
        CreateEnvironmentCommand request,
        CancellationToken ct = default
    )
    {
        var connection = await db
            .Connections.Include(p => p.Environments)
            .FirstOrDefaultAsync(p => p.Id == request.ConnectionId, ct);

        if (connection is null)
            return ConnectionErrors.NotFound(request.ConnectionId);

        var nameNormalized = Connection.NormalizeName(request.Request.Name);
        if (connection.HasEnvironmentNamed(nameNormalized))
            return ConnectionErrors.EnvironmentNameTaken(nameNormalized);

        var env = connection.AddEnvironment(nameNormalized, request.Request.EnvironmentKey);
        await db.SaveChangesAsync(ct);

        return EnvironmentDto.FromEntity(env);
    }
}

public class CreateEnvironmentCommandValidator : AbstractValidator<CreateEnvironmentCommand>
{
    public CreateEnvironmentCommandValidator()
    {
        RuleFor(x => x.Request).SetValidator(new CreateEnvironmentRequestValidator());
    }
}

public class CreateEnvironmentRequestValidator : AbstractValidator<CreateEnvironmentRequest>
{
    public CreateEnvironmentRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
    }
}
