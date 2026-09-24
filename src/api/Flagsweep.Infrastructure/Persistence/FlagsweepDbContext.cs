using System.Linq.Expressions;
using Flagsweep.Application;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using ApplicationUser = Flagsweep.Application.Users.ApplicationUser;

namespace Flagsweep.Infrastructure.Persistence;

public class FlagsweepDbContext(
    DbContextOptions<FlagsweepDbContext> options,
    AuditSaveChangesInterceptor? auditInterceptor = null,
    SoftDeleteSaveChangesInterceptor? softDeleteInterceptor = null
) : IdentityUserContext<ApplicationUser>(options), IFlagsweepDbContext
{
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        if (auditInterceptor is not null)
            optionsBuilder.AddInterceptors(auditInterceptor);
        if (softDeleteInterceptor is not null)
            optionsBuilder.AddInterceptors(softDeleteInterceptor);
    }

    public DbSet<Connection> Connections => Set<Connection>();
    public DbSet<ConnectionEnvironment> Environments => Set<ConnectionEnvironment>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();
    public DbSet<FlagOwner> FlagOwners => Set<FlagOwner>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Connection>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity
                .Property(e => e.ProviderType)
                .IsRequired()
                .HasMaxLength(50)
                .HasConversion<string>();
            entity.Property(e => e.Endpoint).IsRequired().HasMaxLength(StoreEndpoint.MaxLength);
            entity.HasIndex(e => e.Endpoint).IsUnique();
            entity.Property(e => e.ConnectionString).IsRequired().HasMaxLength(2000);
            entity
                .HasMany(e => e.Environments)
                .WithOne(e => e.Connection)
                .HasForeignKey(e => e.ConnectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ConnectionEnvironment>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.EnvironmentKey).HasMaxLength(200);
            entity.HasIndex(e => new { e.ConnectionId, e.Name }).IsUnique();
            entity.Property(e => e.IsProtected).HasDefaultValue(false);
        });

        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);
            entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Token).IsRequired().HasMaxLength(128);
            entity.HasIndex(e => e.Token).IsUnique();
        });

        modelBuilder.Entity<FlagOwner>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FlagId).IsRequired().HasMaxLength(200);
            entity.Property(e => e.UserId).IsRequired();
            entity
                .HasOne(e => e.Connection)
                .WithMany()
                .HasForeignKey(e => e.ConnectionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.ConnectionId, e.FlagId }).IsUnique();
        });

        modelBuilder.Entity<AuditEntry>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.TriggeredById).IsRequired();
            entity.Property(e => e.ChangesJson).HasColumnName("Changes");
            entity
                .HasOne(e => e.Connection)
                .WithMany()
                .HasForeignKey(e => e.ConnectionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity
                .HasOne(e => e.Environment)
                .WithMany()
                .HasForeignKey(e => e.EnvironmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new
            {
                e.ConnectionId,
                e.EnvironmentId,
                e.CreatedAt,
            });
        });

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (!typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
                continue;

            var parameter = Expression.Parameter(entityType.ClrType, "e");
            var filter = Expression.Lambda(
                Expression.Not(Expression.Property(parameter, nameof(ISoftDeletable.IsDeleted))),
                parameter
            );
            modelBuilder.Entity(entityType.ClrType).HasQueryFilter(filter);
        }
    }
}
