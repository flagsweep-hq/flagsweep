using Flagsweep.Application.Flags;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class PagingTests : FunctionalTestBase
{
    public PagingTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    [Fact]
    public async Task FlagsList_HonorsLimitAndOffset_AndReportsHasMore()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionAsync(
            "Paging App",
            [new { name = "Dev", environmentKey = "dev" }]
        );

        foreach (var id in new[] { "flag-a", "flag-b", "flag-c" })
        {
            var resp = await Client.PostAsJsonAsync(
                $"/api/connections/{connection.Id}/flags",
                new
                {
                    id,
                    labels = new[] { "dev" },
                    isEnabled = false,
                }
            );
            resp.StatusCode.Should().Be(HttpStatusCode.NoContent);
        }

        var page1 = await Client.GetFromJsonAsync<PagedResult<FlagDto>>(
            $"/api/connections/{connection.Id}/flags?label=dev&limit=2",
            Json
        );
        page1!.Items.Should().HaveCount(2);
        page1.Total.Should().Be(3);
        page1.Offset.Should().Be(0);
        page1.HasMore.Should().BeTrue();
        page1.Items.Select(f => f.Id).Should().ContainInOrder("flag-a", "flag-b");

        var page2 = await Client.GetFromJsonAsync<PagedResult<FlagDto>>(
            $"/api/connections/{connection.Id}/flags?label=dev&limit=2&offset=2",
            Json
        );
        page2!.Items.Should().ContainSingle(f => f.Id == "flag-c");
        page2.Total.Should().Be(3);
        page2.HasMore.Should().BeFalse();
    }
}
