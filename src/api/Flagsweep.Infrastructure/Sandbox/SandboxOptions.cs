using Microsoft.Extensions.Configuration;

namespace Flagsweep.Infrastructure.Sandbox;

public sealed record SandboxOptions(bool Enabled, bool SeedDemoData, string? ControlSecret = null)
{
    public const string ControlSecretHeader = "X-E2E-Secret";

    public bool ControlEndpoints => ControlSecret is not null;

    public static string[] StripArgs(string[] args) =>
        args.Where(a => a is not ("--sandbox" or "--seed" or "--e2e")).ToArray();

    public static SandboxOptions Resolve(string[] args, IConfiguration configuration)
    {
        var enabled = args.Contains("--sandbox") || configuration.GetValue<bool>("Sandbox");
        var seed =
            enabled && (args.Contains("--seed") || configuration.GetValue<bool>("SeedSandbox"));
        var control = args.Contains("--e2e") || configuration.GetValue<bool>("E2E:Enabled");
        if (!control)
            return new SandboxOptions(enabled, seed);

        if (!enabled)
            throw new InvalidOperationException(
                "--e2e exposes endpoints that wipe data, so it only works together with --sandbox."
            );

        var secret = configuration["E2E:Secret"];
        if (string.IsNullOrWhiteSpace(secret))
            throw new InvalidOperationException(
                "--e2e needs E2E__Secret set; callers must send it in the X-E2E-Secret header."
            );

        return new SandboxOptions(enabled, seed, secret);
    }

    public string DatabaseFileName => Enabled ? "flagsweep-sandbox.db" : "flagsweep.db";
}
