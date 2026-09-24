using System.Net.Http.Headers;
using Azure.Data.AppConfiguration;
using Flagsweep.Application.Connections;
using Flagsweep.Application.Users;
using Flagsweep.Domain;
using Flagsweep.Domain.Models;

namespace Flagsweep.FunctionalTests;

public record AccessTokenResponse(
    string TokenType,
    string AccessToken,
    long ExpiresIn,
    string? RefreshToken
);

[Collection("Functional")]
public abstract class FunctionalTestBase : IAsyncLifetime
{
    protected readonly FunctionalTestFixture Fixture;
    protected readonly HttpClient Client;

    protected IServiceProvider Services => Fixture.Services;

    protected string StoreConnectionString = null!;

    protected virtual bool AuthenticateByDefault => false;

    protected static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    protected FunctionalTestBase(FunctionalTestFixture fixture)
    {
        Fixture = fixture;
        Client = fixture.CreateClient();
    }

    public async Task InitializeAsync()
    {
        await Fixture.ResetDatabaseAsync();
        StoreConnectionString = await FlociAz.NewStoreConnectionStringAsync();

        if (AuthenticateByDefault)
            await SetupAndAuthAsync();
    }

    public Task DisposeAsync()
    {
        Client.Dispose();
        return Task.CompletedTask;
    }

    protected ConfigurationClient StoreClient() => new(StoreConnectionString);

    protected async Task SeedFlagAsync(
        string id,
        bool isEnabled,
        string? label = null,
        string? description = null,
        string? displayName = null
    )
    {
        var setting = new FeatureFlagConfigurationSetting(id, isEnabled, label)
        {
            Description = description,
            DisplayName = displayName,
        };
        await StoreClient().SetConfigurationSettingAsync(setting);
    }

    protected async Task<FeatureFlagConfigurationSetting?> GetStoredFlagAsync(
        string id,
        string? label = null
    )
    {
        try
        {
            var response = await StoreClient()
                .GetConfigurationSettingAsync(
                    FeatureFlagConfigurationSetting.KeyPrefix + id,
                    label
                );
            return response.Value as FeatureFlagConfigurationSetting;
        }
        catch (Azure.RequestFailedException ex) when (ex.Status == 404)
        {
            return null;
        }
    }

    protected async Task<string> SetupAdminAndGetTokenAsync(
        string email = "admin@test.com",
        string password = "Test1234!"
    )
    {
        var setupResp = await Client.PostAsJsonAsync("/api/auth/setup", new { email, password });
        setupResp.EnsureSuccessStatusCode();
        return await LoginAndGetTokenAsync(email, password);
    }

    protected async Task<string> LoginAndGetTokenAsync(string email, string password)
    {
        var resp = await Client.PostAsJsonAsync("/api/auth/login", new { email, password });
        resp.EnsureSuccessStatusCode();
        var token = await resp.Content.ReadFromJsonAsync<AccessTokenResponse>(Json);
        return token!.AccessToken;
    }

    protected const string MemberPassword = "Member1234!";

    protected async Task InviteAndAcceptMemberAsync(string email)
    {
        var inviteResp = await Client.PostAsJsonAsync(
            "/api/users/invitations",
            new { email, role = Roles.Member }
        );
        inviteResp.EnsureSuccessStatusCode();
        var invite = await inviteResp.Content.ReadFromJsonAsync<InviteResponse>(Json);

        var acceptResp = await Client.PostAsJsonAsync(
            "/api/auth/accept-invite",
            new { token = invite!.Token, password = MemberPassword }
        );
        acceptResp.EnsureSuccessStatusCode();
    }

    protected void Authenticate(string token) =>
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

    protected void ClearAuth() => Client.DefaultRequestHeaders.Authorization = null;

    protected async Task<string> SetupAndAuthAsync()
    {
        var token = await SetupAdminAndGetTokenAsync();
        Authenticate(token);
        return token;
    }

    protected Task<HttpResponseMessage> PostConnectionAsync(
        string? name,
        IEnumerable<object>? environments = null,
        string? connectionString = null
    ) =>
        Client.PostAsJsonAsync(
            "/api/connections",
            new
            {
                name,
                providerType = nameof(ProviderType.Azure),
                connectionString = connectionString ?? StoreConnectionString,
                environments,
            }
        );

    protected async Task<ConnectionDto> CreateConnectionAsync(
        string name = "TestConnection",
        IEnumerable<object>? environments = null,
        string? connectionString = null
    )
    {
        var resp = await PostConnectionAsync(name, environments, connectionString);
        resp.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await resp.Content.ReadFromJsonAsync<ConnectionDto>(Json))!;
    }
}
