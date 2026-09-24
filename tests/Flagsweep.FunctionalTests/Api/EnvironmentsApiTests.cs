using Flagsweep.Application.Connections;

namespace Flagsweep.FunctionalTests.Api;

public class EnvironmentsApiTests(FunctionalTestFixture fixture) : ApiTestBase(fixture)
{
    private async Task<(int ConnectionId, int EnvId)> SetupConnectionWithEnvAsync()
    {
        var connection = await CreateConnectionAsync(
            "EnvConnection",
            new[] { new { name = "Staging", environmentKey = "staging" } }
        );
        return (connection.Id, connection.Environments[0].Id);
    }

    [Fact]
    public async Task UpdateEnvironment_ChangesNameAndKey()
    {
        var (connectionId, envId) = await SetupConnectionWithEnvAsync();

        var response = await Client.PutAsJsonAsync(
            $"/api/connections/{connectionId}/environments/{envId}",
            new { name = "Production", environmentKey = "prod" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var env = await response.Content.ReadFromJsonAsync<EnvironmentDto>(Json);
        env!.Name.Should().Be("Production");
        env.EnvironmentKey.Should().Be("prod");
    }

    [Fact]
    public async Task UpdateEnvironment_ClearKey_SetsNull()
    {
        var (connectionId, envId) = await SetupConnectionWithEnvAsync();

        var response = await Client.PutAsJsonAsync(
            $"/api/connections/{connectionId}/environments/{envId}",
            new { environmentKey = "" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var env = await response.Content.ReadFromJsonAsync<EnvironmentDto>(Json);
        env!.EnvironmentKey.Should().BeNull();
    }

    [Fact]
    public async Task UpdateEnvironment_NotFound_Returns404()
    {
        var (connectionId, _) = await SetupConnectionWithEnvAsync();

        var response = await Client.PutAsJsonAsync(
            $"/api/connections/{connectionId}/environments/99999",
            new { name = "Ghost" }
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteEnvironment_RemovesIt()
    {
        var (connectionId, envId) = await SetupConnectionWithEnvAsync();

        var response = await Client.DeleteAsync(
            $"/api/connections/{connectionId}/environments/{envId}"
        );

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var connection = await Client.GetFromJsonAsync<ConnectionDto>(
            $"/api/connections/{connectionId}",
            Json
        );
        connection!.Environments.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteEnvironment_NotFound_Returns404()
    {
        var (connectionId, _) = await SetupConnectionWithEnvAsync();

        var response = await Client.DeleteAsync(
            $"/api/connections/{connectionId}/environments/99999"
        );

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
