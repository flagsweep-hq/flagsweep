using System.Text.Json.Serialization;
using Flagsweep.Application.Authentication;
using Flagsweep.Application.Users;
using Flagsweep.Domain;
using Flagsweep.Infrastructure.Authentication;
using Flagsweep.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;

namespace Flagsweep.Api;

public static class ApiServiceExtensions
{
    public const string CorsPolicy = "FlagsweepFrontend";

    public static IServiceCollection AddApi(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.AddOpenApi();
        services.AddExceptionHandler<ApiExceptionHandler>();
        services.AddProblemDetails();

        services.ConfigureHttpJsonOptions(options =>
        {
            options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
            options.SerializerOptions.Converters.Add(new UtcDateTimeConverter());
        });

        services.AddCors(options =>
            options.AddPolicy(
                CorsPolicy,
                policy =>
                {
                    var origins =
                        configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                        ?? ["http://localhost:5173"];
                    policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
                }
            )
        );

        services.AddHttpContextAccessor();
        services.AddScoped<IUserContext, HttpUserContext>();

        var authOptions =
            configuration.GetSection(AuthOptions.SectionName).Get<AuthOptions>()
            ?? new AuthOptions();
        if (authOptions.Type != AuthType.Password)
            throw new NotSupportedException(
                $"Auth type '{authOptions.Type}' is not supported yet."
            );
        services.AddSingleton(authOptions);

        services
            .AddIdentityApiEndpoints<ApplicationUser>(options =>
            {
                options.Password.RequireDigit = authOptions.Password.RequireDigit;
                options.Password.RequireLowercase = authOptions.Password.RequireLowercase;
                options.Password.RequireUppercase = authOptions.Password.RequireUppercase;
                options.Password.RequireNonAlphanumeric = authOptions
                    .Password
                    .RequireNonAlphanumeric;
                options.Password.RequiredLength = authOptions.Password.RequiredLength;
                options.SignIn.RequireConfirmedAccount = false;
            })
            .AddEntityFrameworkStores<FlagsweepDbContext>()
            .AddClaimsPrincipalFactory<AppClaimsPrincipalFactory>();

        services
            .AddAuthorizationBuilder()
            .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build())
            .AddPolicy(AuthPolicies.AdminOnly, policy => policy.RequireRole(Roles.Admin));

        services.AddHealthChecks().AddDbContextCheck<FlagsweepDbContext>("database");

        return services;
    }
}
