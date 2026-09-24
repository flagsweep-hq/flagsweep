using Flagsweep.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Flagsweep.FunctionalTests;

public class FunctionalTestFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private SqliteConnection _connection = null!;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            var toRemove = services
                .Where(d =>
                    d.ServiceType == typeof(DbContextOptions<FlagsweepDbContext>)
                    || d.ServiceType.FullName?.Contains("EntityFrameworkCore") == true
                    || d.ServiceType == typeof(FlagsweepDbContext)
                )
                .ToList();
            foreach (var d in toRemove)
                services.Remove(d);

            services.AddDbContext<FlagsweepDbContext>(opts => opts.UseSqlite(_connection));
        });
    }

    public async Task InitializeAsync()
    {
        _connection = new SqliteConnection("Data Source=:memory:");
        await _connection.OpenAsync();

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public new async Task DisposeAsync()
    {
        await _connection.DisposeAsync();
        await base.DisposeAsync();
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FlagsweepDbContext>();

        await db.Database.ExecuteSqlRawAsync("DELETE FROM Environments");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Connections");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM Invitations");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserTokens");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserLogins");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUserClaims");
        await db.Database.ExecuteSqlRawAsync("DELETE FROM AspNetUsers");
    }
}

[CollectionDefinition("Functional")]
public class FunctionalTestCollection : ICollectionFixture<FunctionalTestFixture> { }
