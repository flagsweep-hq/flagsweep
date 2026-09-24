using Flagsweep.Application.Authentication;
using Flagsweep.Application.Users;

namespace Flagsweep.Api.Endpoints;

public static class StatusEndpoints
{
    public static RouteGroupBuilder MapStatusApi(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/status");

        group
            .MapGet(
                "/",
                async (IDispatcher dispatcher, AuthOptions auth, CancellationToken ct) =>
                    Results.Ok(
                        new
                        {
                            isSetup = (await dispatcher.Send(new CheckSetupQuery(), ct)).Value,
                            authType = auth.Type.ToString(),
                        }
                    )
            )
            .AllowAnonymous();

        return group;
    }
}
