using Flagsweep.Application.Users;

namespace Flagsweep.Api.Endpoints;

public static class FlagsweepEndpoints
{
    public static IEndpointRouteBuilder MapFlagsweepEndpoints(this IEndpointRouteBuilder routes)
    {
        routes
            .MapGroup("/api/auth")
            .MapIdentityApi<ApplicationUser>()
            .RestrictIdentityRoutes()
            .AllowAnonymous();

        routes.MapHealthApi();
        routes.MapAuthApi();
        routes.MapStatusApi();
        routes.MapUsersApi();
        routes.MapConnectionsApi();
        routes.MapEnvironmentsApi();
        routes.MapFlagsApi();
        routes.MapLabelsApi();
        routes.MapAuditApi();

        return routes;
    }
}
