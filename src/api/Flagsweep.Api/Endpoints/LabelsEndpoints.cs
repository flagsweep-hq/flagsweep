using Flagsweep.Application.Flags;

namespace Flagsweep.Api.Endpoints;

public static class LabelsEndpoints
{
    public static RouteGroupBuilder MapLabelsApi(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/connections/{connectionId:int}/labels");

        group.MapGet(
            "/",
            async (int connectionId, IDispatcher dispatcher, CancellationToken ct) =>
                (await dispatcher.Send(new ListLabelsQuery(connectionId), ct)).ToResponse()
        );

        return group;
    }
}
