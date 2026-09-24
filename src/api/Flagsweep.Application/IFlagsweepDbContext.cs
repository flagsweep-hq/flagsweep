using ApplicationUser = Flagsweep.Application.Users.ApplicationUser;

namespace Flagsweep.Application;

public interface IFlagsweepDbContext
{
    DbSet<Connection> Connections { get; }
    DbSet<ConnectionEnvironment> Environments { get; }
    DbSet<Invitation> Invitations { get; }
    DbSet<AuditEntry> AuditEntries { get; }
    DbSet<FlagOwner> FlagOwners { get; }
    DbSet<ApplicationUser> Users { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
