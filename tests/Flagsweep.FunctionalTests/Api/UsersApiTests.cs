using Flagsweep.Application.Users;
using Microsoft.Extensions.DependencyInjection;

namespace Flagsweep.FunctionalTests.Api;

public class UsersApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task ListUsers_AdminOnly()
    {
        var response = await Client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var users = (
            await response.Content.ReadFromJsonAsync<PagedResult<UserDto>>(Json)
        )!.Items.ToList();
        users.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ListUsers_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuth();

        var response = await Client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task InviteUser_ReturnsInviteUrl()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "invited@test.com", role = "Member" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var invite = await response.Content.ReadFromJsonAsync<InviteResponse>(Json);
        invite!.Email.Should().Be("invited@test.com");
        invite.Role.Should().Be("Member");
        invite.InviteUrl.Should().Contain("/invite/");
    }

    [Fact]
    public async Task ListInvitations_ReturnsActive()
    {
        await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "list@test.com", role = "Member" }
        );

        var response = await Client.GetAsync("/api/users/invitations");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var invitations = (
            await response.Content.ReadFromJsonAsync<PagedResult<InvitationDto>>(Json)
        )!.Items.ToList();
        invitations.Should().NotBeEmpty();
    }

    [Fact]
    public async Task RevokeInvitation()
    {
        var inviteResponse = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "revoke@test.com", role = "Member" }
        );
        var invite = await inviteResponse.Content.ReadFromJsonAsync<InviteResponse>(Json);

        var revokeResponse = await Client.DeleteAsync($"/api/users/invitations/{invite!.Id}");

        revokeResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AcceptInvite_InvalidToken_ReturnsNotFound()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/auth/accept-invite",
            new { token = "bogus-token", password = "password123" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task InviteUser_InvalidEmail_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "not-valid", role = "Member" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task InviteUser_PendingInvitationExists_ReturnsConflict()
    {
        var first = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "pending@test.com", role = "Member" }
        );
        first.IsSuccessStatusCode.Should().BeTrue();

        var second = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "Pending@Test.COM", role = "Member" }
        );

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task InviteUser_ExpiredInvitationExists_AllowsReinvite()
    {
        using (var scope = Services.CreateScope())
        {
            var db =
                scope.ServiceProvider.GetRequiredService<Flagsweep.Infrastructure.Persistence.FlagsweepDbContext>();
            db.Invitations.Add(
                Flagsweep.Domain.Models.Invitation.Create(
                    "expired@test.com",
                    Flagsweep.Domain.Roles.Member,
                    DateTime.UtcNow.AddDays(-8)
                )
            );
            await db.SaveChangesAsync();
        }

        var response = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "expired@test.com", role = "Member" }
        );

        response.IsSuccessStatusCode.Should().BeTrue();
    }

    [Fact]
    public async Task InviteUser_EmailOfExistingUser_ReturnsConflict()
    {
        var users = (
            await Client.GetFromJsonAsync<PagedResult<UserDto>>("/api/users", Json)
        )!.Items.ToList();
        var adminEmail = users!.Single().Email;

        var response = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = adminEmail, role = "Member" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
