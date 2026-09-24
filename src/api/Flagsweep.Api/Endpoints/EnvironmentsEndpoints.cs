using Flagsweep.Application.Connections;

namespace Flagsweep.Api.Endpoints;

public static class EnvironmentsEndpoints
{
    public static RouteGroupBuilder MapEnvironmentsApi(this IEndpointRouteBuilder routes)
    {
        var group = routes
            .MapGroup("/api/connections/{connectionId:int}/environments")
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group.MapPost(
            "/",
            async (
                int connectionId,
                CreateEnvironmentRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(new CreateEnvironmentCommand(connectionId, req), ct)
                ).ToResponse(v => $"/api/connections/{connectionId}/environments/{v.Id}")
        );

        group.MapPatch(
            "/",
            async (
                int connectionId,
                ReorderEnvironmentsRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(new ReorderEnvironmentsCommand(connectionId, req), ct)
                ).ToResponse()
        );

        group.MapPut(
            "/{environmentId:int}",
            async (
                int connectionId,
                int environmentId,
                UpdateEnvironmentRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(
                        new UpdateEnvironmentCommand(connectionId, environmentId, req),
                        ct
                    )
                ).ToResponse()
        );

        group.MapDelete(
            "/{environmentId:int}",
            async (
                int connectionId,
                int environmentId,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(
                        new DeleteEnvironmentCommand(connectionId, environmentId),
                        ct
                    )
                ).ToResponse()
        );

        group.MapPatch(
            "/{environmentId:int}/protection",
            async (
                int connectionId,
                int environmentId,
                SetProtectionRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(
                        new SetEnvironmentProtectionCommand(
                            connectionId,
                            environmentId,
                            req.IsProtected
                        ),
                        ct
                    )
                ).ToResponse()
        );

        return group;
    }
}

public record SetProtectionRequest(bool IsProtected);
