using Flagsweep.Application.Flags;
using Flagsweep.Application.Users;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class FlagOwnershipTests : FunctionalTestBase
{
    public FlagOwnershipTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private async Task<int> CreateConnectionWithEnvsAsync()
    {
        var connection = await CreateConnectionAsync(
            "Owner App",
            [
                new { name = "Dev", environmentKey = "dev" },
                new { name = "Prod", environmentKey = "prod" },
            ]
        );
        return connection.Id;
    }

    private async Task CreateFlagAsync(int connectionId, string id, string label)
    {
        var resp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id,
                labels = new[] { label },
                isEnabled = false,
            }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    private async Task<FlagDto?> GetFlagAsync(int connectionId, string id, string label)
    {
        var resp = await Client.GetAsync($"/api/connections/{connectionId}/flags?label={label}");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        var flags = (
            await resp.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        return flags!.SingleOrDefault(f => f.Id == id);
    }

    private async Task<HttpResponseMessage> SetOwnerAsync(
        int connectionId,
        string id,
        string? userId
    ) =>
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/{id}/owner",
            new { userId }
        );

    private async Task<List<AssignableUserDto>> GetAssignableUsersAsync()
    {
        var resp = await Client.GetAsync("/api/users/assignable");
        resp.StatusCode.Should().Be(HttpStatusCode.OK);
        return (
            (
                await resp.Content.ReadFromJsonAsync<PagedResult<AssignableUserDto>>(Json)
            )!.Items.ToList()
        )!;
    }

    [Fact]
    public async Task AssignOwner_ShowsInFlagList_AcrossEnvironments()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithEnvsAsync();
        await CreateFlagAsync(connectionId, "owned-flag", "dev");
        await CreateFlagAsync(connectionId, "owned-flag", "prod");

        var admin = (await GetAssignableUsersAsync()).Single(u => u.Email == "admin@test.com");

        var resp = await SetOwnerAsync(connectionId, "owned-flag", admin.Id);
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var devFlag = await GetFlagAsync(connectionId, "owned-flag", "dev");
        devFlag!.OwnerId.Should().Be(admin.Id);
        devFlag.OwnerEmail.Should().Be("admin@test.com");

        var prodFlag = await GetFlagAsync(connectionId, "owned-flag", "prod");
        prodFlag!.OwnerEmail.Should().Be("admin@test.com");
    }

    [Fact]
    public async Task ReassignAndClearOwner()
    {
        await SetupAndAuthAsync();
        var memberId = await CreateMemberAsync("colleague@test.com");
        var connectionId = await CreateConnectionWithEnvsAsync();
        await CreateFlagAsync(connectionId, "handover", "dev");

        var admin = (await GetAssignableUsersAsync()).Single(u => u.Email == "admin@test.com");

        (await SetOwnerAsync(connectionId, "handover", admin.Id))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);
        (await SetOwnerAsync(connectionId, "handover", memberId))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);

        var flag = await GetFlagAsync(connectionId, "handover", "dev");
        flag!.OwnerEmail.Should().Be("colleague@test.com");

        (await SetOwnerAsync(connectionId, "handover", null))
            .StatusCode.Should()
            .Be(HttpStatusCode.NoContent);

        flag = await GetFlagAsync(connectionId, "handover", "dev");
        flag!.OwnerId.Should().BeNull();
        flag.OwnerEmail.Should().BeNull();
    }

    [Fact]
    public async Task CreateFlag_WithOwner_AssignsOwnerImmediately()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithEnvsAsync();
        var admin = (await GetAssignableUsersAsync()).Single(u => u.Email == "admin@test.com");

        var resp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "born-owned",
                labels = new[] { "dev" },
                isEnabled = false,
                ownerId = admin.Id,
            }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var flag = await GetFlagAsync(connectionId, "born-owned", "dev");
        flag!.OwnerEmail.Should().Be("admin@test.com");
    }

    [Fact]
    public async Task CreateFlag_WithUnknownOwner_Returns404_AndDoesNotCreateFlag()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithEnvsAsync();

        var resp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "never-born",
                labels = new[] { "dev" },
                isEnabled = false,
                ownerId = "no-such-user",
            }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await GetFlagAsync(connectionId, "never-born", "dev")).Should().BeNull();
    }

    [Fact]
    public async Task AssignOwner_UnknownUser_Returns404()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithEnvsAsync();
        await CreateFlagAsync(connectionId, "orphan", "dev");

        var resp = await SetOwnerAsync(connectionId, "orphan", "no-such-user-id");

        resp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task MemberCanListAssignableUsers_AndAssignOwner()
    {
        await SetupAndAuthAsync();
        var memberId = await CreateMemberAsync("member@test.com");
        var connectionId = await CreateConnectionWithEnvsAsync();
        await CreateFlagAsync(connectionId, "team-flag", "dev");

        Authenticate(await LoginAndGetTokenAsync("member@test.com", MemberPassword));

        var users = await GetAssignableUsersAsync();
        users.Should().Contain(u => u.Email == "member@test.com");

        var resp = await SetOwnerAsync(connectionId, "team-flag", memberId);
        resp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var flag = await GetFlagAsync(connectionId, "team-flag", "dev");
        flag!.OwnerEmail.Should().Be("member@test.com");
    }

    private async Task<string> CreateMemberAsync(string email)
    {
        await InviteAndAcceptMemberAsync(email);

        return (await GetAssignableUsersAsync()).Single(u => u.Email == email).Id;
    }
}
