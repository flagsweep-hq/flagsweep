using Flagsweep.Application;
using Flagsweep.Infrastructure.Authentication;
using Flagsweep.Infrastructure.Persistence;
using Flagsweep.Infrastructure.Providers;
using Flagsweep.Infrastructure.Sandbox;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Flagsweep.Infrastructure;

public static class InfrastructureServiceExtensions
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IHostEnvironment environment,
        IConfiguration configuration,
        SandboxOptions sandbox
    )
    {
        var dbPath = Path.Combine(environment.ContentRootPath, "data", sandbox.DatabaseFileName);
        Directory.CreateDirectory(Path.GetDirectoryName(dbPath)!);
        services.AddScoped<AuditSaveChangesInterceptor>();
        services.AddScoped<SoftDeleteSaveChangesInterceptor>();
        services.AddDbContext<FlagsweepDbContext>(options =>
            options.UseSqlite($"Data Source={dbPath}")
        );
        services.AddScoped<IFlagsweepDbContext>(sp => sp.GetRequiredService<FlagsweepDbContext>());

        services.AddCredentialProtection(environment, configuration);

        if (sandbox.Enabled)
        {
            services.AddSingleton<IFlagStoreProviderFactory, FakeProviderFactory>();
            if (sandbox.SeedDemoData)
                services.AddHostedService<SandboxSeeder>();
            if (sandbox.ControlEndpoints)
                services.AddScoped<SandboxReset>();
        }
        else
        {
            services.AddSingleton<IFlagStoreProviderFactory, FlagStoreProviderFactory>();
        }

        return services;
    }

    public static IServiceProvider MigrateDatabase(this IServiceProvider services)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();
        if (db.Database.IsRelational())
            db.Database.Migrate();
        else
            db.Database.EnsureCreated();
        return services;
    }
}
