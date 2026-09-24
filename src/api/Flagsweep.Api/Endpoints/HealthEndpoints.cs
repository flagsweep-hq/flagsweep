using System.Diagnostics;
using System.Reflection;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;

namespace Flagsweep.Api.Endpoints;

public static class HealthEndpoints
{
    public static IEndpointRouteBuilder MapHealthApi(this IEndpointRouteBuilder routes)
    {
        routes
            .MapHealthChecks(
                "/health",
                new HealthCheckOptions
                {
                    ResponseWriter = async (context, report) =>
                    {
                        context.Response.ContentType = "application/json";
                        var result = new
                        {
                            status = report.Status.ToString(),
                            version = Version(),
                            uptime = (long)
                                (
                                    DateTime.UtcNow
                                    - Process.GetCurrentProcess().StartTime.ToUniversalTime()
                                ).TotalSeconds,
                            checks = report.Entries.Select(e => new
                            {
                                name = e.Key,
                                status = e.Value.Status.ToString(),
                                description = e.Value.Description,
                            }),
                        };
                        await context.Response.WriteAsJsonAsync(result);
                    },
                }
            )
            .AllowAnonymous();

        return routes;
    }

    private static string Version() =>
        typeof(Program)
            .Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
            ?.InformationalVersion.Split('+')[0]
        ?? "dev";
}
