using Flagsweep.Application.Flags;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class FlagLifecycleTests : FunctionalTestBase
{
    public FlagLifecycleTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private async Task<int> CreateConnectionWithDevEnvAsync()
    {
        var connection = await CreateConnectionAsync(
            "Lifecycle App",
            [new { name = "Dev", environmentKey = "dev" }]
        );
        return connection.Id;
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

    [Fact]
    public async Task UpdateFlag_WithNoActualChange_DoesNotTouchTheStore()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "untouched",
                labels = new[] { "dev" },
                displayName = "Untouched",
            }
        );
        var before = await GetStoredFlagAsync("untouched", "dev");

        var resp = await Client.PatchAsJsonAsync(
            $"/api/connections/{connectionId}/flags/untouched?label=dev",
            new { displayName = "Untouched" }
        );
        resp.StatusCode.Should().Be(HttpStatusCode.OK);

        var after = await GetStoredFlagAsync("untouched", "dev");
        after!.LastModified.Should().Be(before!.LastModified);

        var flag = await GetFlagAsync(connectionId, "untouched");
        flag!.ModifiedExternally.Should().NotBe(true);
    }

    [Fact]
    public async Task CreateFlag_NoExpiryGiven_GetsDefaultReviewByDate()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "auto-expiry",
                labels = new[] { "dev" },
                isEnabled = true,
            }
        );

        var flag = await GetFlagAsync(connectionId, "auto-expiry");
        flag!.ExpiresAt.Should().NotBeNull();
        flag.ExpiresAt!.Value.Should()
            .BeCloseTo(DateTimeOffset.UtcNow.AddDays(90), TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task CreateFlag_Permanent_GetsNoExpiry()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connectionId}/flags",
            new
            {
                id = "forever-flag",
                labels = new[] { "dev" },
                isEnabled = true,
                isPermanent = true,
            }
        );

        var flag = await GetFlagAsync(connectionId, "forever-flag");
        flag!.IsPermanent.Should().BeTrue();
        flag.ExpiresAt.Should().BeNull();
    }

    [Fact]
    public async Task ListFlags_ReturnsFlagsOrderedById()
    {
        await SetupAndAuthAsync();
        var connectionId = await CreateConnectionWithDevEnvAsync();

        foreach (var id in new[] { "zebra", "alpha", "monkey" })
        {
            await Client.PostAsJsonAsync(
                $"/api/connections/{connectionId}/flags",
                new
                {
                    id,
                    labels = new[] { "dev" },
                    isEnabled = true,
                }
            );
        }

        var resp = (
            await Client.GetFromJsonAsync<PagedResult<FlagDto>>(
                $"/api/connections/{connectionId}/flags?label=dev",
                Json
            )
        )!.Items.ToList();

        resp!.Select(f => f.Id).Should().ContainInOrder("alpha", "monkey", "zebra");
    }
}
