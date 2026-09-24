using Flagsweep.Application.Users;

namespace Flagsweep.Api.Endpoints;

public static class UsersEndpoints
{
    public static RouteGroupBuilder MapUsersApi(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/users");

        group
            .MapGet(
                "/",
                async (int? limit, int? offset, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(new ListUsersQuery(limit, offset), ct)).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group.MapGet(
            "/assignable",
            async (int? limit, int? offset, IDispatcher dispatcher, CancellationToken ct) =>
                (
                    await dispatcher.Send(new ListAssignableUsersQuery(limit, offset), ct)
                ).ToResponse()
        );

        group
            .MapPost(
                "/invitations",
                async (
                    InviteRequest req,
                    IDispatcher dispatcher,
                    HttpRequest http,
                    CancellationToken ct
                ) =>
                {
                    var baseUrl = $"{http.Scheme}://{http.Host}";
                    return (
                        await dispatcher.Send(new CreateInvitationCommand(req, baseUrl), ct)
                    ).ToResponse();
                }
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapGet(
                "/invitations",
                async (int? limit, int? offset, IDispatcher dispatcher, CancellationToken ct) =>
                    (
                        await dispatcher.Send(new ListInvitationsQuery(limit, offset), ct)
                    ).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapDelete(
                "/invitations/{id}",
                async (int id, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(new RevokeInvitationCommand(id), ct)).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapPost(
                "/{id}/reset-password",
                async (string id, IDispatcher dispatcher, HttpRequest http, CancellationToken ct) =>
                {
                    var baseUrl = $"{http.Scheme}://{http.Host}";
                    return (
                        await dispatcher.Send(new GenerateResetLinkCommand(id, baseUrl), ct)
                    ).ToResponse();
                }
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapDelete(
                "/{id}",
                async (string id, IDispatcher dispatcher, CancellationToken ct) =>
                    (await dispatcher.Send(new DeleteUserCommand(id), ct)).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        group
            .MapPatch(
                "/{id}/role",
                async (
                    string id,
                    ChangeRoleRequest req,
                    IDispatcher dispatcher,
                    CancellationToken ct
                ) => (await dispatcher.Send(new ChangeRoleCommand(id, req), ct)).ToResponse()
            )
            .RequireAuthorization(AuthPolicies.AdminOnly);

        return group;
    }
}
