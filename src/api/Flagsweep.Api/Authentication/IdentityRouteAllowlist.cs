namespace Flagsweep.Api.Authentication;

public static class IdentityRouteAllowlist
{
    public static readonly string[] AllowedRoutes = ["/api/auth/login", "/api/auth/refresh"];

    public static TBuilder RestrictIdentityRoutes<TBuilder>(this TBuilder builder)
        where TBuilder : IEndpointConventionBuilder
    {
        builder.Finally(endpoint =>
        {
            if (
                endpoint is RouteEndpointBuilder route
                && !AllowedRoutes.Contains(route.RoutePattern.RawText, StringComparer.Ordinal)
            )
            {
                route.RequestDelegate = static context =>
                {
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    return Task.CompletedTask;
                };
            }
        });
        return builder;
    }
}
