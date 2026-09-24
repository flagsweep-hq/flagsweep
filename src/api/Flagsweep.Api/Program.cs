using Flagsweep.Api;
using Flagsweep.Api.Endpoints;
using Flagsweep.Application;
using Flagsweep.Infrastructure;
using Flagsweep.Infrastructure.Authentication;
using Flagsweep.Infrastructure.Sandbox;

var builder = WebApplication.CreateBuilder(SandboxOptions.StripArgs(args));
var sandbox = SandboxOptions.Resolve(args, builder.Configuration);
builder.WebHost.ConfigureKestrel(kestrel => kestrel.AddServerHeader = false);

WebApplication app;
try
{
    builder.Services.AddApplication();
    builder.Services.AddInfrastructure(builder.Environment, builder.Configuration, sandbox);
    builder.Services.AddApi(builder.Configuration);
    app = builder.Build();
    app.Services.MigrateDatabase();
    app.Services.ProtectStoredCredentials();
}
catch (CredentialProtectionException ex)
{
    Console.Error.WriteLine($"Flagsweep cannot start: {ex.Message}");
    return 1;
}

if (sandbox.ControlEndpoints)
{
    app.Logger.LogWarning(
        "E2E CONTROL ENDPOINTS active: POST /api/sandbox/reset wipes all sandbox data. Never enable this outside test runs."
    );
}

if (sandbox.Enabled)
{
    app.Logger.LogWarning(
        "SANDBOX MODE active: using in-memory fake providers and {DbFile}. No real cloud connections are used.",
        sandbox.DatabaseFileName
    );
}

app.UseSecurityHeaders();
app.UseCors(ApiServiceExtensions.CorsPolicy);
app.UseExceptionHandler();
app.UseStaticFiles();

app.UseRouting();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi().AllowAnonymous();
}

app.UseAuthentication();
app.UseAuthorization();
app.MapFlagsweepEndpoints();
app.MapSandboxControlApi(sandbox);

app.MapSpaFallback();
app.Run();
return 0;

public partial class Program { }
