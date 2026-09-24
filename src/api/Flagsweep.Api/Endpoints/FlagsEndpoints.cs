using Flagsweep.Application.Flags;

namespace Flagsweep.Api.Endpoints;

public static class FlagsEndpoints
{
    public static RouteGroupBuilder MapFlagsApi(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/connections/{connectionId:int}/flags");

        group.MapGet(
            "/",
            async (
                int connectionId,
                string? label,
                int? limit,
                int? offset,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(
                        new ListFlagsQuery(connectionId, label, limit, offset),
                        ct
                    )
                ).ToResponse()
        );

        group.MapGet(
            "/matrix",
            async (
                int connectionId,
                int? limit,
                int? offset,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(new ListFlagMatrixQuery(connectionId, limit, offset), ct)
                ).ToResponse()
        );

        group.MapPost(
            "/",
            async (
                int connectionId,
                CreateFlagRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) => (await dispatcher.Send(new CreateFlagCommand(connectionId, req), ct)).ToResponse()
        );

        group.MapPatch(
            "/{id}",
            async (
                int connectionId,
                string id,
                string? label,
                UpdateFlagRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(new UpdateFlagCommand(connectionId, id, label, req), ct)
                ).ToResponse()
        );

        group.MapPatch(
            "/{id}/lock",
            async (
                int connectionId,
                string id,
                string? label,
                SetFlagLockRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(
                        new SetFlagLockCommand(connectionId, id, label, req.Locked),
                        ct
                    )
                ).ToResponse()
        );

        group.MapPatch(
            "/{id}/owner",
            async (
                int connectionId,
                string id,
                SetFlagOwnerRequest req,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(new SetFlagOwnerCommand(connectionId, id, req.UserId), ct)
                ).ToResponse()
        );

        group.MapDelete(
            "/{id}",
            async (
                int connectionId,
                string id,
                string? label,
                IDispatcher dispatcher,
                CancellationToken ct
            ) =>
                (
                    await dispatcher.Send(new DeleteFlagCommand(connectionId, id, label), ct)
                ).ToResponse()
        );

        return group;
    }
}
