using Flagsweep.Application.Users;

namespace Flagsweep.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthApi(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/auth");

        group
            .MapPost(
                "/setup",
                async (RegisterRequest req, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(req, ct)).ToResponse()
            )
            .AllowAnonymous();

        group
            .MapPost(
                "/accept-invite",
                async (AcceptInviteRequest req, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(req, ct)).ToResponse()
            )
            .AllowAnonymous();

        group
            .MapGet(
                "/invite/{token}",
                async (string token, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(new ValidateInviteTokenQuery(token), ct)).ToResponse()
            )
            .AllowAnonymous();

        group
            .MapPost(
                "/reset-password",
                async (ResetPasswordRequest req, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(req, ct)).ToResponse()
            )
            .AllowAnonymous();

        group.MapPost(
            "/change-password",
            async (ChangePasswordRequest req, IDispatcher dispatcher, CancellationToken ct) =>
                (await dispatcher.Send(req, ct)).ToResponse()
        );

        group.MapGet(
            "/me",
            async (IDispatcher dispatcher, CancellationToken ct) =>
                (await dispatcher.Send(new GetCurrentUserQuery(), ct)).ToResponse()
        );

        return group;
    }
}
