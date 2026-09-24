using Flagsweep.Application.Users;

namespace Flagsweep.FunctionalTests.Api;

public class AuthApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    protected override bool AuthenticateByDefault => false;

    [Fact]
    public async Task Status_BeforeSetup_ReturnsFalse()
    {
        var response = await Client.GetAsync("/api/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("isSetup").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Setup_FirstUser_ReturnsNoContent()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "setup@test.com", password = "password123" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Setup_SecondTime_ReturnsConflict()
    {
        await SetupAdminAndGetTokenAsync("first@test.com");

        var response = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "second@test.com", password = "password123" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Setup_InvalidEmail_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "not-an-email", password = "password123" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Setup_ShortPassword_ReturnsBadRequest()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/auth/setup",
            new { email = "test@test.com", password = "12345" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_ValidCredentials_ReturnsToken()
    {
        await SetupAdminAndGetTokenAsync("login@test.com", "password123");

        var response = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "login@test.com", password = "password123" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await response.Content.ReadFromJsonAsync<AccessTokenResponse>(Json);
        auth!.AccessToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Login_WrongPassword_ReturnsUnauthorized()
    {
        await SetupAdminAndGetTokenAsync("wrong@test.com", "password123");

        var response = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "wrong@test.com", password = "wrongpassword" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_NonexistentUser_ReturnsUnauthorized()
    {
        var response = await Client.PostAsJsonAsync(
            "/api/auth/login",
            new { email = "nobody@test.com", password = "password123" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_Authenticated_ReturnsUser()
    {
        await SetupAndAuthAsync();

        var response = await Client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await response.Content.ReadFromJsonAsync<UserDto>(Json);
        user!.Email.Should().Be("admin@test.com");
    }

    [Fact]
    public async Task Me_Unauthenticated_ReturnsUnauthorized()
    {
        var response = await Client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
