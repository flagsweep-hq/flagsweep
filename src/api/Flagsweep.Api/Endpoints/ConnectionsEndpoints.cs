using Flagsweep.Application.Connections;

namespace Flagsweep.Api.Endpoints;

public static class ConnectionsEndpoints
{
    public static RouteGroupBuilder MapConnectionsApi(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/connections");

        group.MapGet(
            "/",
            async (int? limit, int? offset, IDispatcher dispatcher, CancellationToken ct) =>
                (await dispatcher.Send(new ListConnectionsQuery(limit, offset), ct)).ToResponse()
        );

        group
            .MapPost(
                "/",
                async (CreateConnectionRequest req, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(req, ct)).ToResponse(v => $"/api/connections/{v.Id}")
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapPost(
                "/discover",
                async (DiscoverStoreRequest req, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(req, ct)).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group.MapGet(
            "/{connectionId:int}",
            async (int connectionId, IDispatcher dispatcher, CancellationToken ct) =>
                (await dispatcher.Send(new GetConnectionQuery(connectionId), ct)).ToResponse()
        );

        group
            .MapPut(
                "/{connectionId:int}",
                async (
                    int connectionId,
                    UpdateConnectionRequest req,
                    IDispatcher dispatcher,
                    CancellationToken ct
                ) =>
                    (
                        await dispatcher.Send(new UpdateConnectionCommand(connectionId, req), ct)
                    ).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapDelete(
                "/{connectionId:int}",
                async (int connectionId, IDispatcher dispatcher, CancellationToken ct) =>
                    (
                        await dispatcher.Send(new DeleteConnectionCommand(connectionId), ct)
                    ).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapPut(
                "/{connectionId:int}/connection-string",
                async (
                    int connectionId,
                    UpdateConnectionStringRequest req,
                    IDispatcher dispatcher,
                    CancellationToken ct
                ) =>
                    (
                        await dispatcher.Send(
                            new UpdateConnectionStringCommand(connectionId, req),
                            ct
                        )
                    ).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapGet(
                "/{connectionId:int}/status",
                async (
                    int connectionId,
                    HttpContext http,
                    IDispatcher dispatcher,
                    CancellationToken ct
                ) =>
                {
                    http.Response.Headers.CacheControl = "no-store";
                    return (
                        await dispatcher.Send(new GetConnectionStatusQuery(connectionId), ct)
                    ).ToResponse();
                }
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        return group;
    }
}
