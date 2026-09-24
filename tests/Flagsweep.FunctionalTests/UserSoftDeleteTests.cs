using Flagsweep.Application.Audit;
using Flagsweep.Application.Flags;
using Flagsweep.Application.Users;
using Flagsweep.Domain;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class UserSoftDeleteTests : FunctionalTestBase
{
    public UserSoftDeleteTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private async Task<int> CreateConnectionWithDevEnvAsync()
    {
        var connection = await CreateConnectionAsync(
            "SoftDelete App",
            [new { name = "Dev", environmentKey = "dev" }]
        );
        return connection.Id;
    }

    private async Task<string> CreateMemberAsync(string email)
    {
        await InviteAndAcceptMemberAsync(email);

        var users = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        return users!.Single(u => u.Email == email).Id;
    }

    [Fact]
    public async Task DeletedUser_CannotLogin_AndIsNotAssignable()
    {
        await SetupAndAuthAsync();
        var memberId = await CreateMemberAsync("leaver@test.com");

        (await Client.DeleteAsync($"/api/users/{memberId}"))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);

        var loginResp = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "leaver@test.com", password = MemberPassword }
        );
        loginResp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var assignable = (
            await Client.GetFromJsonAsync<PagedResult<AssignableUserDto>>(
                "/api/users/assignable",
                Json
            )
        )!.Items.ToList();
        assignable!.Should().NotContain(u => u.Id == memberId);

        var connectionId = await CreateConnectionWithDevEnvAsync();
        var createResp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "some-flag",
                labels = new[] { "dev" },
                isEnabled = false,
            }
        );
        createResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var assignResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/some-flag/owner",
            new { userId = memberId }
        );
        assignResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeletedOwner_SurfacesOnFlags_InsteadOfDisappearing()
    {
        await SetupAndAuthAsync();
        var memberId = await CreateMemberAsync("owner-leaving@test.com");
        var connectionId = await CreateConnectionWithDevEnvAsync();

        var createResp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "orphaned-flag",
                labels = new[] { "dev" },
                isEnabled = false,
                ownerId = memberId,
            }
        );
        createResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await Client.DeleteAsync($"/api/users/{memberId}"))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);

        var flagsResp = await Client.GetAsync($"/api/connections/{connectionId}/flags?label=dev");
        var flags = (
            await flagsResp.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        var flag = flags!.Single(f => f.Id == "orphaned-flag");

        flag.OwnerId.Should().Be(memberId);
        flag.OwnerEmail.Should().Be("owner-leaving@test.com");
        flag.OwnerIsDeleted.Should().BeTrue();

        var admin = (
            (
                await Client.GetFromJsonAsync<PagedResult<AssignableUserDto>>(
                    "/api/users/assignable",
                    Json
                )
            )!.Items.ToList()
        )!.Single(u => u.Email == "admin@test.com");
        var reassign = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/orphaned-flag/owner",
            new { userId = admin.Id }
        );
        reassign.StatusCode.Should().Be(HttpStatusCode.NoContent);

        flags = (
            await (
                await Client.GetAsync($"/api/connections/{connectionId}/flags?label=dev")
            ).Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        flags!.Single(f => f.Id == "orphaned-flag").OwnerIsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task RestoreByReinvite_ReactivatesSameAccount_WithNewPassword()
    {
        await SetupAndAuthAsync();
        var memberId = await CreateMemberAsync("returning@test.com");
        var connectionId = await CreateConnectionWithDevEnvAsync();

        var createResp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "welcome-back",
                labels = new[] { "dev" },
                isEnabled = false,
                ownerId = memberId,
            }
        );
        createResp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await Client.DeleteAsync($"/api/users/{memberId}"))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);

        var inviteResp = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "returning@test.com", role = Roles.Admin }
        );
        inviteResp.EnsureSuccessStatusCode();
        var invite = await inviteResp.Content.ReadFromJsonAsync<InviteResponse>(Json);

        ClearAuth();
        var acceptResp = await Client.PostAsJsonAsync(
            "/api/auth/accept-invite",
            new { token = invite!.Token, password = "Fresh1234!" }
        );
        acceptResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var oldLogin = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "returning@test.com", password = MemberPassword }
        );
        oldLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        Authenticate(await LoginAndGetTokenAsync("returning@test.com", "Fresh1234!"));

        var users = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        var restored = users!.Single(u => u.Email == "returning@test.com");
        restored.Id.Should().Be(memberId);
        restored.Role.Should().Be(Roles.Admin);
        restored.IsDeleted.Should().BeFalse();
        restored.DeletedAt.Should().BeNull();

        var flags = (
            await (
                await Client.GetAsync($"/api/connections/{connectionId}/flags?label=dev")
            ).Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        var flag = flags!.Single(f => f.Id == "welcome-back");
        flag.OwnerId.Should().Be(memberId);
        flag.OwnerIsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task AuditAttribution_SurvivesActorDeletion()
    {
        await SetupAndAuthAsync();
        var adminToken = Client.DefaultRequestHeaders.Authorization!.Parameter!;
        var memberId = await CreateMemberAsync("author@test.com");
        var connectionId = await CreateConnectionWithDevEnvAsync();

        Authenticate(await LoginAndGetTokenAsync("author@test.com", MemberPassword));
        var createResp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "attributed-flag",
                labels = new[] { "dev" },
                isEnabled = true,
            }
        );
        createResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        Authenticate(adminToken);
        (await Client.DeleteAsync($"/api/users/{memberId}"))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);

        var audit = (
            await Client.GetFromJsonAsync<PagedResult<AuditEntryDto>>(
                $"/api/connections/{connectionId}/audit",
                Json
            )
        )!.Items.ToList();
        var entry = audit!.Single(e => e.Changes.Any(c => c.FlagId == "attributed-flag"));
        entry.TriggeredByEmail.Should().Be("author@test.com");
    }
}
