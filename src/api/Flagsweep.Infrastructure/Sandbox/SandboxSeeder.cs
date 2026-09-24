using Flagsweep.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Flagsweep.Infrastructure.Sandbox;

public class SandboxSeeder(
    IServiceProvider services,
    IFlagStoreProviderFactory providerFactory,
    ILogger<SandboxSeeder> logger
) : IHostedService
{
    private sealed record FlagSpec(
        string Suffix,
        string Name,
        bool Enabled = true,
        bool Permanent = false,
        int? ExpiresInDays = null,
        string[]? EnabledOnlyIn = null
    );

    private static readonly FlagSpec[] Specs =
    [
        new("new-checkout", "New Checkout", EnabledOnlyIn: ["dev"]),
        new("dark-mode", "Dark Mode", Enabled: true, Permanent: true),
        new("payments-kill-switch", "Payments Kill Switch", Enabled: true, Permanent: true),
        new("beta-banner", "Beta Banner", EnabledOnlyIn: ["dev", "stage"]),
        new("summer-sale", "Summer Sale", Enabled: true, ExpiresInDays: 5),
        new("holiday-promo", "Holiday Promo", Enabled: false, ExpiresInDays: 21),
        new("legacy-csv-export", "Legacy CSV Export", Enabled: true, ExpiresInDays: -30),
    ];

    public async Task StartAsync(CancellationToken ct)
    {
        try
        {
            await SeedAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Sandbox seeder: skipped (seeding failed).");
        }
    }

    private async Task SeedAsync(CancellationToken ct)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();

        var connections = await db.Connections.Include(p => p.Environments).ToListAsync(ct);

        if (connections.Count == 0)
        {
            logger.LogInformation(
                "Sandbox seeder: no connections found; skipping. Create a connection in the UI, then restart to seed flags."
            );
            return;
        }

        var totalFlags = 0;
        foreach (var connection in connections)
        {
            var provider = providerFactory.Create(connection);

            var labels =
                connection.Environments.Count > 0
                    ? connection.Environments.Select(e => e.EnvironmentKey).Distinct().ToList()
                    : [null];

            foreach (var label in labels)
            {
                foreach (var spec in Specs)
                {
                    var id = spec.Suffix;
                    var enabled = spec.EnabledOnlyIn is not null
                        ? spec.EnabledOnlyIn.Contains(label)
                        : spec.Enabled;

                    var flag = new FeatureFlag(
                        Id: id,
                        Key: string.Empty,
                        Label: label,
                        IsEnabled: enabled,
                        Description: "Sandbox demo flag",
                        DisplayName: spec.Name,
                        LastModified: null,
                        IsPermanent: spec.Permanent,
                        ExpiresAt: spec.ExpiresInDays is int d
                            ? DateTimeOffset.UtcNow.AddDays(d)
                            : null
                    );

                    await provider.UpsertFlagAsync(flag, ct);
                    totalFlags++;
                }
            }
        }

        logger.LogWarning(
            "Sandbox seeder: seeded {Count} demo flags across {Connections} connection(s).",
            totalFlags,
            connections.Count
        );
    }

    public Task StopAsync(CancellationToken ct) => Task.CompletedTask;
}
