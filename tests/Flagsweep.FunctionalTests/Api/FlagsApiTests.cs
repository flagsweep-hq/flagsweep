using Flagsweep.Application.Flags;

namespace Flagsweep.FunctionalTests.Api;

public class FlagsApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    private async Task<int> SetupConnectionAsync() =>
        (await CreateConnectionAsync("FlagConnection")).Id;

    [Fact]
    public async Task ListFlags_ReturnsSeededFlags()
    {
        var connectionId = await SetupConnectionAsync();
        await SeedFlagAsync("seeded-one", isEnabled: true);
        await SeedFlagAsync("seeded-two", isEnabled: false);

        var response = await Client.GetAsync($"/api/connections/{connectionId}/flags");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var flags = (
            await response.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        flags.Should().HaveCount(2);
        flags!.Select(f => f.Id).Should().BeEquivalentTo("seeded-one", "seeded-two");
    }

    [Fact]
    public async Task CreateAndToggleFlag()
    {
        var connectionId = await SetupConnectionAsync();

        var createResponse = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "my-test-flag",
                isEnabled = false,
                description = "A test flag",
            }
        );

        createResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var toggleResponse = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/my-test-flag",
            new { enabled = true }
        );

        toggleResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateFlagMetadata()
    {
        var connectionId = await SetupConnectionAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new { id = "meta-flag", isEnabled = true }
        );

        var response = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/meta-flag",
            new { displayName = "Updated Name", description = "Updated desc" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteFlag_RemovesItFromTheStore()
    {
        var connectionId = await SetupConnectionAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new { id = "delete-me", isEnabled = false }
        );

        var response = await Client.DeleteAsync($"/api/connections/{connectionId}/flags/delete-me");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var remaining = await Client.GetFromJsonAsync<PagedResult<FlagDto>>(
            $"/api/connections/{connectionId}/flags",
            Json
        );
        remaining!.Items.Should().NotContain(f => f.Id == "delete-me");
    }

    [Fact]
    public async Task ToggleFlag_NotFound_ReturnsNotFound()
    {
        var connectionId = await SetupConnectionAsync();

        var response = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/nonexistent-flag",
            new { enabled = true }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListFlags_WithLabelFilter()
    {
        var connectionId = await SetupConnectionAsync();
        await SeedFlagAsync("labeled-flag", isEnabled: true, label: "Development");
        await SeedFlagAsync("unlabeled-flag", isEnabled: true);

        var response = await Client.GetAsync(
            $"/api/connections/{connectionId}/flags?label=Development"
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var flags = (
            await response.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        flags.Should().ContainSingle(f => f.Id == "labeled-flag");
    }

    [Fact]
    public async Task ListLabels()
    {
        var connectionId = await SetupConnectionAsync();
        await SeedFlagAsync("flag-a", isEnabled: true, label: "Development");
        await SeedFlagAsync("flag-b", isEnabled: true, label: "Production");

        var response = await Client.GetAsync($"/api/connections/{connectionId}/labels");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var labels = await response.Content.ReadFromJsonAsync<List<string>>(Json);
        labels.Should().Contain("Development").And.Contain("Production");
    }

    [Fact]
    public async Task ListFlags_MoreThanOnePage_ReturnsAllFlags()
    {
        var connectionId = await SetupConnectionAsync();
        const int flagCount = 120;
        for (var i = 0; i < flagCount; i++)
            await SeedFlagAsync($"paging-flag-{i:D3}", isEnabled: true);

        var response = await Client.GetAsync($"/api/connections/{connectionId}/flags?limit=500");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var page = await response.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json);
        page!.Items.Should().HaveCount(flagCount);
        page.Total.Should().Be(flagCount);
        page.HasMore.Should().BeFalse();
        page.Items.Select(f => f.Id).Should().OnlyHaveUniqueItems();

        var defaultResp = await Client.GetAsync($"/api/connections/{connectionId}/flags");
        var defaultPage = await defaultResp.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json);
        defaultPage!.Items.Should().HaveCount(50);
        defaultPage.Total.Should().Be(flagCount);
        defaultPage.HasMore.Should().BeTrue();
    }

    [Fact]
    public async Task Flags_Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuth();

        var response = await Client.GetAsync("/api/connections/1/flags");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Theory]
    [InlineData("Dashboard.Counter")]
    [InlineData("my-app.feature_one")]
    [InlineData("UPPER_CASE")]
    [InlineData("dots.and-dashes_underscores")]
    public async Task CreateFlag_PreservesIdAsIs(string flagId)
    {
        var connectionId = await SetupConnectionAsync();

        var createResp = await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new { id = flagId, isEnabled = false }
        );
        createResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var listResp = await Client.GetAsync($"/api/connections/{connectionId}/flags");
        var flags = (
            await listResp.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        flags.Should().Contain(f => f.Id == flagId);
    }

    [Fact]
    public async Task Flags_InvalidConnection_ReturnsEmptyList()
    {
        var response = await Client.GetAsync("/api/connections/99999/flags");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var flags = (
            await response.Content.ReadFromJsonAsync<PagedResult<FlagDto>>(Json)
        )!.Items.ToList();
        flags.Should().BeEmpty();
    }
}
