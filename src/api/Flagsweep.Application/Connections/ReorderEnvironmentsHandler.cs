namespace Flagsweep.Application.Connections;

public record ReorderEnvironmentsRequest(List<int> EnvironmentIds);

public record ReorderEnvironmentsCommand(int ConnectionId, ReorderEnvironmentsRequest Request)
    : IRequest<Result>;

public class ReorderEnvironmentsHandler(IFlagsweepDbContext db)
    : IRequestHandler<ReorderEnvironmentsCommand, Result>
{
    public async Task<Result> HandleAsync(
        ReorderEnvironmentsCommand request,
        CancellationToken ct = default
    )
    {
        var connection = await db
            .Connections.Include(p => p.Environments)
            .FirstOrDefaultAsync(p => p.Id == request.ConnectionId, ct);

        if (connection is null || connection.Environments.Count == 0)
            return ConnectionErrors.NotFoundOrEmpty(request.ConnectionId);

        connection.ReorderEnvironments(request.Request.EnvironmentIds);

        await db.SaveChangesAsync(ct);
        return Result.Ok();
    }
}

public class ReorderEnvironmentsCommandValidator : AbstractValidator<ReorderEnvironmentsCommand>
{
    public ReorderEnvironmentsCommandValidator()
    {
        RuleFor(x => x.Request.EnvironmentIds).NotEmpty();
    }
}
