using Flagsweep.Application.Audit;
using Flagsweep.Application.Flags;
using Flagsweep.Application.Users;
using Flagsweep.Domain.Models;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class FlagLockTests : FunctionalTestBase
{
    public FlagLockTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private async Task<int> CreateConnectionWithDevEnvAsync()
    {
        var connection = await CreateConnectionAsync(
            "Lock App",
            [new { name = "Dev", environmentKey = "dev" }]
        );
        return connection.Id;
    }

    private async Task CreateFlagAsync(int connectionId, string id, bool isEnabled = true)
    {
        var resp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id,
                labels = new[] { "dev" },
                isEnabled,
            }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private async Task<FlagDto?> GetFlagAsync(int connectionId, string id)
    {
        var resp = await Client.GetAsync($"/api/connections/{connectionId}/flags?label=dev");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var flags = (
            await resp.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        return flags!.SingleOrDefault(f => f.Id == id);
    }

    private async Task<HttpResponseMessage> SetLockAsync(
        int connectionId,
        string id,
        bool locked
    ) =>
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/{id}/lock?label=dev",
            new { locked }
        );

    [Fact]
    public async Task LockFlag_SurfacesIsLocked_AndStoreIsReadOnly()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();
        await CreateFlagAsync(connectionId, "lockable");

        var lockResp = await SetLockAsync(connectionId, "lockable", true);
        lockResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var flag = await GetFlagAsync(connectionId, "lockable");
        flag.Should().NotBeNull();
        flag!.IsLocked.Should().BeTrue();

        var stored = await GetStoredFlagAsync("lockable", "dev");
        stored.Should().NotBeNull();
        stored!.IsReadOnly.Should().BeTrue();
    }

    [Fact]
    public async Task ToggleLockedFlag_Returns409_UnlockAllowsToggle()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();
        await CreateFlagAsync(connectionId, "guarded", isEnabled: true);

        (await SetLockAsync(connectionId, "guarded", true)).EnsureSuccessStatusCode();

        var toggleResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/guarded?label=dev",
            new { enabled = false }
        );
        toggleResp.StatusCode.Should().Be(HttpStatusCode.Conflict);

        (await GetFlagAsync(connectionId, "guarded"))!.IsEnabled.Should().BeTrue();

        (await SetLockAsync(connectionId, "guarded", false)).EnsureSuccessStatusCode();

        var retryResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/guarded?label=dev",
            new { enabled = false }
        );
        retryResp.StatusCode.Should().Be(HttpStatusCode.OK);
        (await GetFlagAsync(connectionId, "guarded"))!.IsEnabled.Should().BeFalse();
    }

    [Fact]
    public async Task LockAndUnlock_RecordAuditEntries()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();
        await CreateFlagAsync(connectionId, "audited");

        (await SetLockAsync(connectionId, "audited", true)).EnsureSuccessStatusCode();
        (await SetLockAsync(connectionId, "audited", false)).EnsureSuccessStatusCode();

        var entries = (
            await Client.GetFromJsonAsync<PagedResult<AuditEntryDto>>(
                $"/api/connections/{connectionId}/audit",
                Json
            )
        )!.Items.ToList();

        var lockChanges = entries!
            .SelectMany(e => e.Changes)
            .Where(c => c.FlagId == "audited" && c.Field == FlagChangeField.Locked)
            .ToList();
        lockChanges.Should().Contain(c => c.From == "false" && c.To == "true");
        lockChanges.Should().Contain(c => c.From == "true" && c.To == "false");
    }

    [Fact]
    public async Task MemberCannotLock_Returns403()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();
        await CreateFlagAsync(connectionId, "admin-only");

        await InviteAndAcceptMemberAsync("lockmember@test.com");
        Authenticate(await LoginAndGetTokenAsync("lockmember@test.com", MemberPassword));

        var lockResp = await SetLockAsync(connectionId, "admin-only", true);
        lockResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<string> InviteMemberAndAuthAsync(string email)
    {
        await InviteAndAcceptMemberAsync(email);

        Authenticate(await LoginAndGetTokenAsync(email, MemberPassword));
        var me = await Client.GetFromJsonAsync<UserDto>("/api/auth/me", Json);
        return me!.Id;
    }

    [Fact]
    public async Task FlagOwner_WhoIsOnlyAMember_CanLockAndUnlockTheirFlag()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);
        var connectionId = await CreateConnectionWithDevEnvAsync();
        await CreateFlagAsync(connectionId, "owned-lock");

        var memberId = await InviteMemberAndAuthAsync("lockowner@test.com");

        Authenticate(adminToken);
        (
            await Client.PatchAsJsonAsync(
                $"/api/connections/{connectionId}/flags/owned-lock/owner",
                new { userId = memberId }
            )
        ).EnsureSuccessStatusCode();

        Authenticate(await LoginAndGetTokenAsync("lockowner@test.com", MemberPassword));

        (await SetLockAsync(connectionId, "owned-lock", true)).EnsureSuccessStatusCode();
        (await GetFlagAsync(connectionId, "owned-lock"))!.IsLocked.Should().BeTrue();

        (await SetLockAsync(connectionId, "owned-lock", false)).EnsureSuccessStatusCode();
        (await GetFlagAsync(connectionId, "owned-lock"))!.IsLocked.Should().BeFalse();
    }

    [Fact]
    public async Task FlagOwner_WhoIsOnlyAMember_CannotLockInAProtectedEnvironment()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        var connection = await CreateConnectionAsync(
            "Protected Lock App",
            [
                new { name = "Dev", environmentKey = "dev" },
                new { name = "Prod", environmentKey = "prod" },
            ]
        );
        (
            await Client.PostAsJsonAsync(
                $"/api/connections/{connection.Id}/flags",
                new { id = "prod-owned", labels = new[] { "prod" } }
            )
        ).EnsureSuccessStatusCode();

        var prodEnv = connection.Environments.Single(e => e.EnvironmentKey == "prod");
        (
            await Client.PatchAsJsonAsync(
                $"/api/connections/{connection.Id}/environments/{prodEnv.Id}/protection",
                new { isProtected = true }
            )
        ).EnsureSuccessStatusCode();

        var memberId = await InviteMemberAndAuthAsync("prodlockowner@test.com");

        Authenticate(adminToken);
        (
            await Client.PatchAsJsonAsync(
                $"/api/connections/{connection.Id}/flags/prod-owned/owner",
                new { userId = memberId }
            )
        ).EnsureSuccessStatusCode();

        Authenticate(await LoginAndGetTokenAsync("prodlockowner@test.com", MemberPassword));

        var lockResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/prod-owned/lock?label=prod",
            new { locked = true }
        );
        lockResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
