using Flagsweep.Domain;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class AdminAuthorizationTests : FunctionalTestBase
{
    public AdminAuthorizationTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    [Theory]
    [InlineData("GET", "/api/users")]
    [InlineData("GET", "/api/users/invitations")]
    [InlineData("DELETE", "/api/users/invitations/1")]
    [InlineData("POST", "/api/users/some-id/reset-password")]
    [InlineData("DELETE", "/api/users/some-id")]
    [InlineData("PATCH", "/api/users/some-id/role")]
    [InlineData("PUT", "/api/connections/1")]
    [InlineData("DELETE", "/api/connections/1")]
    [InlineData("POST", "/api/connections/1/environments")]
    [InlineData("PATCH", "/api/connections/1/environments")]
    [InlineData("PUT", "/api/connections/1/environments/1")]
    [InlineData("DELETE", "/api/connections/1/environments/1")]
    [InlineData("PATCH", "/api/connections/1/environments/1/protection")]
    [InlineData("POST", "/api/connections")]
    [InlineData("POST", "/api/connections/discover")]
    [InlineData("PUT", "/api/connections/1/connection-string")]
    [InlineData("GET", "/api/connections/1/status")]
    public async Task AdminOnlyEndpoints_RejectMember(string method, string path)
    {
        await SetupAndAuthAsync();
        var memberToken = await CreateMemberAndGetTokenAsync();
        Authenticate(memberToken);

        var response = await Client.SendAsync(new HttpRequestMessage(new HttpMethod(method), path));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminOnlyEndpoints_AllowAdmin()
    {
        await SetupAndAuthAsync();

        var response = await Client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task MemberCannotInviteUsers()
    {
        await SetupAndAuthAsync();
        var memberToken = await CreateMemberAndGetTokenAsync();
        Authenticate(memberToken);

        var response = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email = "escalation@test.com", role = Roles.Admin }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<string> CreateMemberAndGetTokenAsync()
    {
        await InviteAndAcceptMemberAsync("member@test.com");

        return await LoginAndGetTokenAsync("member@test.com", MemberPassword);
    }
}
