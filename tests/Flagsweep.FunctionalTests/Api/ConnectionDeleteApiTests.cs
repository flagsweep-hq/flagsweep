namespace Flagsweep.FunctionalTests.Api;

public class ConnectionDeleteApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    [Fact]
    public async Task DeleteConnection_RemovesConnectionAndEnvironments()
    {
        var connection = await CreateConnectionAsync("ToDelete", new[] { new { name = "Dev" } });

        var deleteResp = await Client.DeleteAsync($"/api/connections/{connection.Id}");
        deleteResp.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var getResp = await Client.GetAsync($"/api/connections/{connection.Id}");
        getResp.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteConnection_NotFound_Returns404()
    {
        var response = await Client.DeleteAsync("/api/connections/99999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteConnection_FreesTheStoreForANewConnection()
    {
        var connection = await CreateConnectionAsync("Connection1");

        await Client.DeleteAsync($"/api/connections/{connection.Id}");

        var recreated = await PostConnectionAsync("Connection2");
        recreated.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
