namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class ProtectionTests : FunctionalTestBase
{
    public ProtectionTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    [Fact]
    public async Task ProtectedEnvironment_MemberCannotToggle_AdminCan()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);

        var connection = await CreateConnectionAsync(
            "Protected Test",
            [new { name = "Prod", environmentKey = "prod" }]
        );
        var envId = connection.Environments[0].Id;

        var protectResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/environments/{envId}/protection",
            new { isProtected = true }
        );
        protectResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        await InviteAndAcceptMemberAsync("member@test.com");
        var memberToken = await LoginAndGetTokenAsync("member@test.com", MemberPassword);

        await SeedFlagAsync("test-flag", isEnabled: true, label: "prod", displayName: "Test");

        Authenticate(memberToken);
        var toggleResp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/test-flag?label=prod",
            new { enabled = false }
        );
        toggleResp.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await GetStoredFlagAsync("test-flag", "prod"))!.IsEnabled.Should().BeTrue();

        Authenticate(adminToken);
        var adminToggle = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/test-flag?label=prod",
            new { enabled = false }
        );
        adminToggle.StatusCode.Should().Be(HttpStatusCode.OK);
        (await GetStoredFlagAsync("test-flag", "prod"))!.IsEnabled.Should().BeFalse();
    }
}
