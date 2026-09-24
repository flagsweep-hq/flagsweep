using Flagsweep.Application.Connections;
using Flagsweep.Application.Flags;
using Flagsweep.Application.Users;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class FlagMatrixTests : FunctionalTestBase
{
    public FlagMatrixTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private Task<ConnectionDto> CreateConnectionWithEnvsAsync() =>
        CreateConnectionAsync(
            "Matrix App",
            [
                new { name = "Dev", environmentKey = "dev" },
                new { name = "Staging", environmentKey = "staging" },
                new { name = "Prod", environmentKey = "prod" },
            ]
        );

    private Task<PagedResult<FlagMatrixRow>?> GetMatrixAsync(int connectionId, string query = "") =>
        Client.GetFromJsonAsync<PagedResult<FlagMatrixRow>>(
            $"/api/connections/{connectionId}/flags/matrix{query}",
            Json
        );

    [Fact]
    public async Task Matrix_GroupsEveryLabelUnderOneFlag()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new
            {
                id = "everywhere",
                labels = new[] { "dev", "staging", "prod" },
                description = "Shared",
            }
        );

        var matrix = await GetMatrixAsync(connection.Id);

        var row = matrix!.Items.Should().ContainSingle().Subject;
        row.FlagId.Should().Be("everywhere");
        row.Description.Should().Be("Shared");
        row.Copies.Select(c => c.Label).Should().BeEquivalentTo(["dev", "staging", "prod"]);
    }

    [Fact]
    public async Task Matrix_OmitsEnvironmentsWhereTheFlagDoesNotExist()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new { id = "dev-only", labels = new[] { "dev" } }
        );

        var matrix = await GetMatrixAsync(connection.Id);

        var row = matrix!.Items.Should().ContainSingle().Subject;
        row.Copies.Should().ContainSingle();
        row.Copies[0].Label.Should().Be("dev");
    }

    [Fact]
    public async Task Matrix_ReportsPerEnvironmentEnabledState()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new { id = "partly-on", labels = new[] { "dev", "prod" } }
        );
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/partly-on?label=dev",
            new { enabled = true }
        );

        var matrix = await GetMatrixAsync(connection.Id);

        var copies = matrix!.Items.Single().Copies.ToDictionary(c => c.Label!, c => c.IsEnabled);
        copies["dev"].Should().BeTrue();
        copies["prod"].Should().BeFalse();
    }

    [Fact]
    public async Task Matrix_CarriesConnectionWideOwnerOnEveryRow()
    {
        var adminToken = await SetupAdminAndGetTokenAsync();
        Authenticate(adminToken);
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new { id = "owned", labels = new[] { "dev", "prod" } }
        );

        var me = await Client.GetFromJsonAsync<UserDto>("/api/auth/me", Json);
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/owned/owner",
            new { userId = me!.Id }
        );

        var matrix = await GetMatrixAsync(connection.Id);

        var row = matrix!.Items.Single();
        row.OwnerId.Should().Be(me.Id);
        row.OwnerEmail.Should().NotBeNullOrEmpty();
        row.OwnerIsDeleted.Should().BeFalse();
    }

    [Fact]
    public async Task Matrix_IncludesCopiesStoredUnderNoLabel()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new { id = "unlabelled" }
        );

        var matrix = await GetMatrixAsync(connection.Id);

        var row = matrix!.Items.Should().ContainSingle().Subject;
        row.FlagId.Should().Be("unlabelled");
        row.Copies.Should().ContainSingle();
        row.Copies[0].Label.Should().BeNullOrEmpty();
    }

    [Fact]
    public async Task Matrix_PagesOverFlagsNotCopies()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        foreach (var id in new[] { "alpha", "bravo", "charlie" })
        {
            await Client.PostAsJsonAsync(
                $"/api/connections/{connection.Id}/flags",
                new { id, labels = new[] { "dev", "staging", "prod" } }
            );
        }

        var firstPage = await GetMatrixAsync(connection.Id, "?limit=2");

        firstPage!.Total.Should().Be(3);
        firstPage.Items.Should().HaveCount(2);
        firstPage.Items.Select(r => r.FlagId).Should().BeEquivalentTo(["alpha", "bravo"]);
        firstPage.Items.Should().OnlyContain(r => r.Copies.Count == 3);
        firstPage.HasMore.Should().BeTrue();

        var secondPage = await GetMatrixAsync(connection.Id, "?limit=2&offset=2");
        secondPage!.Items.Should().ContainSingle();
        secondPage.Items[0].FlagId.Should().Be("charlie");
        secondPage.HasMore.Should().BeFalse();
    }

    [Fact]
    public async Task Matrix_ReportsDriftAgainstTheRightEnvironment()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new { id = "drifty", labels = new[] { "dev", "prod" } }
        );

        var stored = await GetStoredFlagAsync("drifty", "dev");
        stored!.IsEnabled = true;
        await StoreClient().SetConfigurationSettingAsync(stored);

        var matrix = await GetMatrixAsync(connection.Id);

        var copies = matrix!
            .Items.Single()
            .Copies.ToDictionary(c => c.Label!, c => c.ModifiedExternally);
        copies["dev"].Should().BeTrue();
        copies["prod"].Should().BeFalse();
    }

    [Fact]
    public async Task Matrix_NameAndDescriptionComeFromTheFirstLabel_NotProviderOrder()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();

        await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/flags",
            new { id = "disagreeing", labels = new[] { "dev", "prod" } }
        );

        await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/disagreeing?label=dev",
            new { displayName = "Agreed Name", description = "From dev" }
        );
        await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/flags/disagreeing?label=prod",
            new { displayName = "Stale Name", description = "From prod" }
        );

        foreach (var _ in Enumerable.Range(0, 3))
        {
            var row = (await GetMatrixAsync(connection.Id))!.Items.Single();
            row.DisplayName.Should().Be("Agreed Name", "dev sorts before prod");
            row.Description.Should().Be("From dev");
            row.Copies.Select(c => c.Label).Should().ContainInOrder("dev", "prod");
        }
    }

    [Fact]
    public async Task Matrix_RequiresAuthentication()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionWithEnvsAsync();
        ClearAuth();

        var resp = await Client.GetAsync($"/api/connections/{connection.Id}/flags/matrix");

        resp.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
