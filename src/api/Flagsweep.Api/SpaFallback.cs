namespace Flagsweep.Api;

public static class SpaFallback
{
    public static IEndpointConventionBuilder MapSpaFallback(this IEndpointRouteBuilder routes)
    {
        var fallback = routes.MapFallbackToFile("{*path}", "index.html").AllowAnonymous();
        fallback.Finally(endpoint =>
        {
            var serveIndex = endpoint.RequestDelegate!;
            endpoint.RequestDelegate = context =>
            {
                var path = context.Request.Path;
                if (path.StartsWithSegments("/api") || path.StartsWithSegments("/assets"))
                {
                    context.Response.StatusCode = StatusCodes.Status404NotFound;
                    return Task.CompletedTask;
                }
                context.Response.Headers.CacheControl = "no-cache, no-store, must-revalidate";
                return serveIndex(context);
            };
        });
        return fallback;
    }
}
