using Flagsweep.Application.Users;
using Microsoft.Extensions.DependencyInjection;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class AuthFlowTests : FunctionalTestBase
{
    public AuthFlowTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    [Fact]
    public async Task FullAuthFlow_Setup_Login_Me()
    {
        var statusResp = await Client.GetFromJsonAsync<StatusResponse>("/api/status", Json);
        statusResp!.IsSetup.Should().BeFalse();

        var token = await SetupAdminAndGetTokenAsync("owner@company.com", "SecurePass1!");
        token.Should().NotBeNullOrWhiteSpace();

        statusResp = await Client.GetFromJsonAsync<StatusResponse>("/api/status", Json);
        statusResp!.IsSetup.Should().BeTrue();

        var loginToken = await LoginAndGetTokenAsync("owner@company.com", "SecurePass1!");
        loginToken.Should().NotBeNullOrWhiteSpace();

        Authenticate(loginToken);
        var meResp = await Client.GetAsync("/api/auth/me");
        meResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var me = await meResp.Content.ReadFromJsonAsync<UserDto>(Json);
        me!.Email.Should().Be("owner@company.com");

        ClearAuth();
        var secondSetup = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "other@test.com", password = "Test1234!" }
        );
        secondSetup.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task IdentityRegister_IsNotExposed()
    {
        await SetupAdminAndGetTokenAsync();

        var register = await Client.PostAsJsonAsync(
            "/api/auth/register",
            new { email = "uninvited@evil.com", password = "Password1!" }
        );
        register.StatusCode.Should().Be(HttpStatusCode.NotFound);

        var login = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "uninvited@evil.com", password = "Password1!" }
        );
        login.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("POST", "/api/auth/forgotPassword")]
    [InlineData("POST", "/api/auth/resetPassword")]
    [InlineData("POST", "/api/auth/resendConfirmationEmail")]
    [InlineData("GET", "/api/auth/confirmEmail?userId=x&code=y")]
    [InlineData("GET", "/api/auth/manage/info")]
    [InlineData("POST", "/api/auth/manage/2fa")]
    public async Task UnusedIdentityRoutes_AreNotExposed(string method, string path)
    {
        var token = await SetupAdminAndGetTokenAsync();
        Authenticate(token);

        var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (method == "POST")
            request.Content = JsonContent.Create(new { email = "owner@company.com" });

        var response = await Client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ResetLink_SetsNewPassword_AndRejectsReuse()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);
        var me = await Client.GetFromJsonAsync<UserDto>("/api/auth/me", Json);

        var linkResp = await Client.PostAsync($"/api/users/{me!.Id}/reset-password", null);
        linkResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var link = await linkResp.Content.ReadFromJsonAsync<ResetLinkResponse>(Json);

        ClearAuth();
        var reset = await Client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new
            {
                email = link!.Email,
                token = link.Token,
                newPassword = "AfterReset1!",
            }
        );
        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await LoginAndGetTokenAsync("admin@test.com", "AfterReset1!"))
            .Should()
            .NotBeNullOrWhiteSpace();

        var oldLogin = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "admin@test.com", password = "Test1234!" }
        );
        oldLogin.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var reuse = await Client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new
            {
                email = link.Email,
                token = link.Token,
                newPassword = "Another1!",
            }
        );
        reuse.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var unknownUser = await Client.PostAsJsonAsync(
            "/api/auth/reset-password",
            new
            {
                email = "nobody@test.com",
                token = link.Token,
                newPassword = "Another1!",
            }
        );
        unknownUser.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ChangePassword_RequiresCurrentPassword()
    {
        var token = await SetupAdminAndGetTokenAsync();

        ClearAuth();
        var anonymous = await Client.PostAsJsonAsync(
            "/api/auth/change-password",
            new { currentPassword = "Test1234!", newPassword = "Changed1!" }
        );
        anonymous.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        Authenticate(token);
        var wrongCurrent = await Client.PostAsJsonAsync(
            "/api/auth/change-password",
            new { currentPassword = "nope", newPassword = "Changed1!" }
        );
        wrongCurrent.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var ok = await Client.PostAsJsonAsync(
            "/api/auth/change-password",
            new { currentPassword = "Test1234!", newPassword = "Changed1!" }
        );
        ok.StatusCode.Should().Be(HttpStatusCode.NoContent);

        ClearAuth();
        (await LoginAndGetTokenAsync("admin@test.com", "Changed1!"))
            .Should()
            .NotBeNullOrWhiteSpace();
    }

    [Theory]
    [InlineData("/api/does-not-exist")]
    [InlineData("/api/auth/nope")]
    public async Task UnknownApiGet_Returns404_NotSpaFallback(string path)
    {
        await SetupAndAuthAsync();

        var response = await Client.GetAsync(path);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        response.Content.Headers.ContentType?.MediaType.Should().NotBe("text/html");
    }

    [Fact]
    public async Task ClientRouteWithADotInIt_IsNotRefusedByTheServer()
    {
        ClearAuth();

        var dotted = await Client.GetAsync("/connections/1/flags/Checkout.NewFlow");
        var plain = await Client.GetAsync("/connections/1/flags/CheckoutNewFlow");

        dotted.StatusCode.Should().NotBe(HttpStatusCode.Unauthorized);
        dotted.StatusCode.Should().Be(plain.StatusCode);
    }

    [Fact]
    public async Task InviteFlow_AdminInvites_UserAccepts()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        var inviteResp = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "member@company.com", role = "Member" }
        );
        inviteResp.StatusCode.Should().Be(HttpStatusCode.OK);
        var invite = await inviteResp.Content.ReadFromJsonAsync<InviteResponse>(Json);
        invite!.Email.Should().Be("member@company.com");

        ClearAuth();
        var validateResp = await Client.GetAsync($"/api/auth/invite/{invite.Token}");
        validateResp.StatusCode.Should().Be(HttpStatusCode.OK);

        var acceptResp = await Client.PostAsJsonAsync(
            "/api/auth/accept-invite",
            new { token = invite.Token, password = "MemberPass1!" }
        );
        acceptResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var memberLoginToken = await LoginAndGetTokenAsync("member@company.com", "MemberPass1!");

        Authenticate(memberLoginToken);
        var usersResp = await Client.GetAsync("/api/users");
        usersResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task RevokedInvite_CannotBeAccepted()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        var inviteResp = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "revoked@test.com", role = "Member" }
        );
        var invite = await inviteResp.Content.ReadFromJsonAsync<InviteResponse>(Json);

        var revokeResp = await Client.DeleteAsync($"/api/users/invitations/{invite!.Id}");
        revokeResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        ClearAuth();
        var acceptResp = await Client.PostAsJsonAsync(
            "/api/auth/accept-invite",
            new { token = invite.Token, password = "Test1234!" }
        );
        acceptResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Setup_MembersExistButNoAdmin_IsStillAllowed()
    {
        using (var scope = Fixture.Services.CreateScope())
        {
            var userManager =
                scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<ApplicationUser>>();
            var member = new ApplicationUser
            {
                UserName = "member@company.com",
                Email = "member@company.com",
                Role = Flagsweep.Domain.Roles.Member,
            };
            (await userManager.CreateAsync(member, "MemberPass1!")).Succeeded.Should().BeTrue();
        }

        var status = await Client.GetFromJsonAsync<StatusResponse>("/api/status", Json);
        status!.IsSetup.Should().BeFalse();

        var setupResp = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "rescue-admin@company.com", password = "SecurePass1!" }
        );
        setupResp.IsSuccessStatusCode.Should().BeTrue();

        status = await Client.GetFromJsonAsync<StatusResponse>("/api/status", Json);
        status!.IsSetup.Should().BeTrue();
    }

    [Fact]
    public async Task DeleteUser_LastAdmin_IsRejected()
    {
        var token = await SetupAdminAndGetTokenAsync("first@company.com", "SecurePass1!");
        Client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        string lastAdminId;
        using (var scope = Fixture.Services.CreateScope())
        {
            var userManager =
                scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<ApplicationUser>>();
            var lastAdmin = new ApplicationUser
            {
                UserName = "second@company.com",
                Email = "second@company.com",
                Role = Flagsweep.Domain.Roles.Admin,
            };
            (await userManager.CreateAsync(lastAdmin, "SecurePass1!")).Succeeded.Should().BeTrue();
            lastAdminId = lastAdmin.Id;

            var caller = await userManager.FindByEmailAsync("first@company.com");
            caller!.Role = Flagsweep.Domain.Roles.Member;
            (await userManager.UpdateAsync(caller)).Succeeded.Should().BeTrue();
        }

        var deleteResp = await Client.DeleteAsync($"/api/users/{lastAdminId}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var demoteResp = await Client.PatchAsJsonAsync(
            $"/api/users/{lastAdminId}/role",
            new { role = "Member" }
        );
        demoteResp.StatusCode.Should().Be(HttpStatusCode.Conflict);

        var keepAdminResp = await Client.PatchAsJsonAsync(
            $"/api/users/{lastAdminId}/role",
            new { role = "Admin" }
        );
        keepAdminResp.IsSuccessStatusCode.Should().BeTrue();
    }

    private record StatusResponse(bool IsSetup);
}
