namespace Flagsweep.Application.Connections;

public record UpdateConnectionRequest(string Name);

public record UpdateConnectionCommand(int Id, UpdateConnectionRequest Request) : IRequest<Result>;

public class UpdateConnectionHandler(IFlagsweepDbContext db)
    : IRequestHandler<UpdateConnectionCommand, Result>
{
    public async Task<Result> HandleAsync(
        UpdateConnectionCommand request,
        CancellationToken ct = default
    )
    {
        var connection = await db.Connections.FindAsync([request.Id], ct);
        if (connection is null)
            return ConnectionErrors.NotFound(request.Id);

        connection.Update(request.Request.Name);
        await db.SaveChangesAsync(ct);
        return Result.Ok();
    }
}

public class UpdateConnectionCommandValidator : AbstractValidator<UpdateConnectionCommand>
{
    public UpdateConnectionCommandValidator()
    {
        RuleFor(x => x.Request.Name).NotEmpty().MaximumLength(100);
    }
}
