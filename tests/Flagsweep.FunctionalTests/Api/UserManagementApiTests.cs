using Flagsweep.Application.Users;

namespace Flagsweep.FunctionalTests.Api;

public class UserManagementApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    protected override bool AuthenticateByDefault => false;

    private async Task<(string AdminToken, string MemberId)> SetupAdminAndMemberAsync()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        await InviteAndAcceptMemberAsync("member@test.com");

        var usersResp = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        var member = usersResp!.First(u => u.Email == "member@test.com");

        return (adminToken, member.Id);
    }

    [Fact]
    public async Task ChangeRole_AdminChangesUserRole()
    {
        var (adminToken, memberId) = await SetupAdminAndMemberAsync();

        var response = await Client.PatchAsJsonAsync(
            $"/api/users/{memberId}/role",
            new { role = "Admin" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var users = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        users!.First(u => u.Id == memberId).Role.Should().Be("Admin");
    }

    [Fact]
    public async Task DeleteUser_SoftDeletesUser()
    {
        var (adminToken, memberId) = await SetupAdminAndMemberAsync();

        var response = await Client.DeleteAsync($"/api/users/{memberId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var users = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        var deleted = users!.Single(u => u.Id == memberId);
        deleted.IsDeleted.Should().BeTrue();
        deleted.DeletedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task DeleteUser_NonExistent_ReturnsNotFound()
    {
        await SetupAndAuthAsync();

        var response = await Client.DeleteAsync("/api/users/nonexistent-id");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ResetPassword_GeneratesLink()
    {
        var (adminToken, memberId) = await SetupAdminAndMemberAsync();

        var response = await Client.PostAsync($"/api/users/{memberId}/reset-password", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>(Json);
        result.GetProperty("token").GetString().Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ChangeRole_MemberCannotChange_ReturnsForbidden()
    {
        var (adminToken, memberId) = await SetupAdminAndMemberAsync();

        Authenticate(await LoginAndGetTokenAsync("member@test.com", MemberPassword));

        var response = await Client.PatchAsJsonAsync(
            $"/api/users/{memberId}/role",
            new { role = "Admin" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteUser_Self_ReturnsConflict()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        var users = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        var self = users!.Single();

        var response = await Client.DeleteAsync($"/api/users/{self.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ChangeRole_Self_ReturnsConflict()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        var users = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        var self = users!.Single();

        var response = await Client.PatchAsJsonAsync(
            $"/api/users/{self.Id}/role",
            new { role = "Member" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ChangeRole_InvalidRole_ReturnsBadRequest()
    {
        var (_, memberId) = await SetupAdminAndMemberAsync();

        var response = await Client.PatchAsJsonAsync(
            $"/api/users/{memberId}/role",
            new { role = "Overlord" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeleteUser_AdminWithAnotherAdminRemaining_Succeeds()
    {
        var (_, memberId) = await SetupAdminAndMemberAsync();

        var promote = await Client.PatchAsJsonAsync(
            $"/api/users/{memberId}/role",
            new { role = "Admin" }
        );
        promote.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var response = await Client.DeleteAsync($"/api/users/{memberId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task ChangeRole_DemoteAdminWithAnotherAdminRemaining_Succeeds()
    {
        var (_, memberId) = await SetupAdminAndMemberAsync();

        var promote = await Client.PatchAsJsonAsync(
            $"/api/users/{memberId}/role",
            new { role = "Admin" }
        );
        promote.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var demote = await Client.PatchAsJsonAsync(
            $"/api/users/{memberId}/role",
            new { role = "Member" }
        );

        demote.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
