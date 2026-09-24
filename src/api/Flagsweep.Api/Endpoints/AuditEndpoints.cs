using Flagsweep.Application.Audit;

namespace Flagsweep.Api.Endpoints;

public static class AuditEndpoints
{
    public static RouteGroupBuilder MapAuditApi(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/connections/{connectionId:int}/audit");

        group.MapGet(
            "/",
            async (
                int connectionId,
                int? environmentId,
                int? limit,
                int? offset,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(
                        new ListAuditEntriesQuery(connectionId, environmentId, limit, offset),
                        ct
                    )
                ).ToResponse()
        );

        return group;
    }
}
