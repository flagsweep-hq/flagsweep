using Flagsweep.Infrastructure.Persistence;

namespace Flagsweep.Infrastructure.Sandbox;

public class SandboxReset(FlagsweepDbContext db, IFlagStoreProviderFactory providerFactory)
{
    public async Task RunAsync(CancellationToken ct)
    {
        if (providerFactory is not FakeProviderFactory fakeStores)
            throw new InvalidOperationException("Reset is only available with sandbox stores.");

        await db.AuditEntries.ExecuteDeleteAsync(ct);
        await db.FlagOwners.ExecuteDeleteAsync(ct);
        await db.Environments.ExecuteDeleteAsync(ct);
        await db.Connections.ExecuteDeleteAsync(ct);
        await db.Invitations.ExecuteDeleteAsync(ct);
        await db.UserTokens.ExecuteDeleteAsync(ct);
        await db.UserLogins.ExecuteDeleteAsync(ct);
        await db.UserClaims.ExecuteDeleteAsync(ct);
        await db.Users.IgnoreQueryFilters().ExecuteDeleteAsync(ct);

        fakeStores.Clear();
    }
}
