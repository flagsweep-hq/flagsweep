using Flagsweep.Application.Connections;
using Flagsweep.Domain.Models;

namespace Flagsweep.FunctionalTests.Api;

public class ConnectionsApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task Unauthenticated_ReturnsUnauthorized()
    {
        ClearAuth();

        var response = await Client.GetAsync("/api/connections");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateAndGetConnection()
    {
        var connection = await CreateConnectionAsync("My Connection");

        connection.Name.Should().Be("My Connection");
        connection.ProviderType.Should().Be("Azure");
        connection.Endpoint.Should().Be(StoreEndpoint.Parse(StoreConnectionString));

        var getResponse = await Client.GetAsync($"/api/connections/{connection.Id}");
        getResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateConnection_NeverEchoesTheSecret()
    {
        var response = await PostConnectionAsync("Secretive");

        var body = await response.Content.ReadAsStringAsync();
        body.Should().NotContain("Secret=").And.NotContain("Id=");
    }

    [Fact]
    public async Task CreateConnection_WithEnvironments()
    {
        var connection = await CreateConnectionAsync(
            "EnvConnection",
            new object[] { new { name = "Dev" }, new { name = "Prod", environmentKey = "prod" } }
        );

        connection.Environments.Should().HaveCount(2);
        connection.Environments[0].Name.Should().Be("Dev");
        connection.Environments[1].Name.Should().Be("Prod");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Id=abc;Secret=c2VjcmV0")]
    [InlineData("Endpoint=not-a-url;Id=abc;Secret=c2VjcmV0")]
    public async Task CreateConnection_WithoutValidConnectionString_ReturnsBadRequest(
        string? connectionString
    )
    {
        var response = await Client.PostAsJsonAsync(
            "/api/connections",
            new
            {
                name = "Bad",
                providerType = "Azure",
                connectionString,
            }
        );

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateConnection_SameStoreTwice_ReturnsConflict()
    {
        await CreateConnectionAsync("First");

        var endpoint = StoreEndpoint.Parse(StoreConnectionString)!;
        var sameStore = $"Endpoint={endpoint.ToUpperInvariant()}/;Id=other;Secret=b3RoZXI=";
        var response = await PostConnectionAsync("Second", connectionString: sameStore);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync())
            .Should()
            .Contain("already connected as 'First'");
    }

    [Fact]
    public async Task UpdateConnection()
    {
        var connection = await CreateConnectionAsync("Old");

        var updateResponse = await Client.PutAsJsonAsync(
            $"/api/connections/{connection.Id}",
            new { name = "New Name" }
        );

        updateResponse.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResponse = await Client.GetAsync($"/api/connections/{connection.Id}");
        var updated = await getResponse.Content.ReadFromJsonAsync<ConnectionDto>(Json);
        updated!.Name.Should().Be("New Name");
    }

    [Fact]
    public async Task ListConnections()
    {
        await CreateConnectionAsync("P1");
        await CreateConnectionAsync(
            "P2",
            connectionString: await FlociAz.NewStoreConnectionStringAsync()
        );

        var response = await Client.GetAsync("/api/connections");
        var list = (
            await response.Content.ReadFromJsonAsync<PagedResult<ConnectionDto>>(Json)
        )!.Items.ToList();

        list.Select(p => p.Name).Should().BeEquivalentTo("P1", "P2");
    }

    [Fact]
    public async Task AddEnvironment()
    {
        var connection = await CreateConnectionAsync("EnvTest");

        var envResponse = await Client.PostAsJsonAsync(
            $"/api/connections/{connection.Id}/environments",
            new { name = "Staging", environmentKey = "staging" }
        );

        envResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var env = await envResponse.Content.ReadFromJsonAsync<EnvironmentDto>(Json);
        env!.Name.Should().Be("Staging");
    }

    [Fact]
    public async Task SetEnvironmentProtection_AdminOnly()
    {
        var connection = await CreateConnectionAsync(
            "ProtTest",
            new[] { new { name = "Prod", environmentKey = "prod" } }
        );
        var envId = connection.Environments[0].Id;

        var response = await Client.PatchAsJsonAsync(
            $"/api/connections/{connection.Id}/environments/{envId}/protection",
            new { isProtected = true }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task CreateConnection_EmptyName_ReturnsBadRequest()
    {
        var response = await PostConnectionAsync("");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetConnection_NotExists_ReturnsNotFound()
    {
        var response = await Client.GetAsync("/api/connections/99999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
