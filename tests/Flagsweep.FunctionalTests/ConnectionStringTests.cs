using Flagsweep.Application.Connections;
using Flagsweep.Application.Flags;
using Flagsweep.Domain.Models;

namespace Flagsweep.FunctionalTests;

[Collection("Functional")]
public class ConnectionStringTests : FunctionalTestBase
{
    private const string UnreachableConnectionString =
        "Endpoint=http://localhost:1;Id=dead;Secret=ZGVhZA==";

    public ConnectionStringTests(FunctionalTestFixture fixture)
        : base(fixture) { }

    private Task<HttpResponseMessage> DiscoverAsync(string? connectionString) =>
        Client.PostAsJsonAsync(
            "/api/connections/discover",
            new { providerType = nameof(ProviderType.Azure), connectionString }
        );

    [Fact]
    public async Task Discover_ReturnsStoreNameEndpointAndLabels()
    {
        await SetupAndAuthAsync();
        await SeedFlagAsync("meta-a", isEnabled: true, label: "dev");
        await SeedFlagAsync("meta-b", isEnabled: true, label: "prod");

        var response = await DiscoverAsync(StoreConnectionString);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var metadata = await response.Content.ReadFromJsonAsync<StoreMetadata>(Json);
        metadata!.StoreName.Should().NotBeNullOrEmpty();
        metadata.Endpoint.Should().Be(StoreEndpoint.Parse(StoreConnectionString));
        metadata.Labels.Should().BeEquivalentTo("dev", "prod");
    }

    [Fact]
    public async Task Discover_StoreAlreadyConnected_ReturnsConflict()
    {
        await SetupAndAuthAsync();
        await CreateConnectionAsync("Taken");

        var response = await DiscoverAsync(StoreConnectionString);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync())
            .Should()
            .Contain("already connected as 'Taken'");
    }

    [Fact]
    public async Task Discover_Unreachable_ReturnsBadRequest()
    {
        await SetupAndAuthAsync();

        var response = await DiscoverAsync(UnreachableConnectionString);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("Could not connect");
    }

    [Fact]
    public async Task Discover_NoEndpoint_ReturnsBadRequest()
    {
        await SetupAndAuthAsync();

        var response = await DiscoverAsync("Id=abc;Secret=c2VjcmV0");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetStatus_ProviderReachable_ReportsConnectedWithLabelCount()
    {
        await SetupAndAuthAsync();
        await SeedFlagAsync("status-a", isEnabled: true, label: "dev");
        await SeedFlagAsync("status-b", isEnabled: true, label: "prod");
        var connection = await CreateConnectionAsync("Reachable");

        var before = DateTimeOffset.UtcNow;
        var response = await Client.GetAsync($"/api/connections/{connection.Id}/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await response.Content.ReadFromJsonAsync<ConnectionStatus>(Json);
        status!.Status.Should().Be(ConnectionStatus.Connected);
        status.Message.Should().Contain("2 label(s)");
        status
            .CheckedAt.Should()
            .BeOnOrAfter(before)
            .And.BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(1));
    }

    [Fact]
    public async Task GetStatus_ProviderFails_ReturnsOkWithFailedStatus()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionAsync(
            "Unreachable",
            connectionString: UnreachableConnectionString
        );

        var response = await Client.GetAsync($"/api/connections/{connection.Id}/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await response.Content.ReadFromJsonAsync<ConnectionStatus>(Json);
        status!.Status.Should().Be(ConnectionStatus.Failed);
        status.Message.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetStatus_SetsNoStoreSoStaleStatusIsNeverServed()
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionAsync("Cacheable");

        var response = await Client.GetAsync($"/api/connections/{connection.Id}/status");

        response.Headers.CacheControl!.NoStore.Should().BeTrue();
    }

    [Fact]
    public async Task GetStatus_UnknownConnection_ReturnsNotFound()
    {
        await SetupAndAuthAsync();

        var response = await Client.GetAsync("/api/connections/99999/status");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateConnection_RotatedKeyForSameStore_KeepsWorking()
    {
        await SetupAndAuthAsync();
        await SeedFlagAsync("rotated", isEnabled: true);
        var connection = await CreateConnectionAsync(
            "Rotating",
            connectionString: UnreachableConnectionString
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/connections/{connection.Id}/connection-string",
            new { connectionString = StoreConnectionString }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var fetched = await Client.GetFromJsonAsync<ConnectionDto>(
            $"/api/connections/{connection.Id}",
            Json
        );
        fetched!.Endpoint.Should().Be(StoreEndpoint.Parse(StoreConnectionString));
        var flags = await Client.GetFromJsonAsync<PagedResult<FlagDto>>(
            $"/api/connections/{connection.Id}/flags",
            Json
        );
        flags!.Items.Select(f => f.Id).Should().Contain("rotated");
    }

    [Fact]
    public async Task UpdateConnection_ToAnotherConnectionsStore_ReturnsConflict()
    {
        await SetupAndAuthAsync();
        await CreateConnectionAsync("Owner");
        var other = await CreateConnectionAsync(
            "Other",
            connectionString: await FlociAz.NewStoreConnectionStringAsync()
        );

        var response = await Client.PutAsJsonAsync(
            $"/api/connections/{other.Id}/connection-string",
            new { connectionString = StoreConnectionString }
        );

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Id=abc;Secret=c2VjcmV0")]
    public async Task UpdateConnection_Invalid_ReturnsBadRequest(string? connectionString)
    {
        await SetupAndAuthAsync();
        var connection = await CreateConnectionAsync("Untouched");

        var response = await Client.PutAsJsonAsync(
            $"/api/connections/{connection.Id}/connection-string",
            new { connectionString }
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
