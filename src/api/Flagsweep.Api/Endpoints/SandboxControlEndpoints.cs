using System.Security.Cryptography;
using System.Text;
using Flagsweep.Infrastructure.Sandbox;

namespace Flagsweep.Api.Endpoints;

public static class SandboxControlEndpoints
{
    public static IEndpointRouteBuilder MapSandboxControlApi(
        this IEndpointRouteBuilder routes,
        SandboxOptions sandbox
    )
    {
        if (sandbox.ControlSecret is not { } secret)
            return routes;

        var expected = Encoding.UTF8.GetBytes(secret);

        routes
            .MapPost(
                "/api/sandbox/reset",
                async (HttpRequest http, SandboxReset reset, CancellationToken ct) =>
                {
                    var given = Encoding.UTF8.GetBytes(
                        http.Headers[SandboxOptions.ControlSecretHeader].ToString()
                    );
                    if (!CryptographicOperations.FixedTimeEquals(given, expected))
                        return Results.NotFound();

                    await reset.RunAsync(ct);
                    return Results.NoContent();
                }
            )
            .AllowAnonymous();

        return routes;
    }
}
