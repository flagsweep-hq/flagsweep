namespace Flagsweep.Application.Users;

internal static class UserErrors
{
    internal static Error NotFound() => Error.NotFound("User not found.");

    internal static Error NotAuthenticated() => Error.Unauthorized("Not authenticated.");

    internal static Error UnknownUser() => Error.Unauthorized("User not found.");

    internal static Error CannotChangeOwnRole() => Error.Conflict("Cannot change your own role.");

    internal static Error CannotDeleteSelf() => Error.Conflict("Cannot delete yourself.");

    internal static Error EmailTaken() => Error.Conflict("A user with this email already exists.");

    internal static Error ActiveInvitationExists() =>
        Error.Conflict("An active invitation already exists for this email.");

    internal static Error InvitationNotFound() => Error.NotFound("Invitation not found.");

    internal static Error InvalidOrExpiredInvitation() =>
        Error.NotFound("Invalid or expired invitation.");

    internal static Error InvalidOrExpiredResetToken() =>
        Error.Validation("Invalid or expired password reset link.");

    internal static Error CurrentPasswordIncorrect() =>
        Error.Validation("Current password is incorrect.");

    internal static Error SetupAlreadyCompleted() =>
        Error.Conflict("Setup already completed. An admin user already exists.");

    internal static Error IdentityFailure(IdentityResult result) =>
        Error.Validation(string.Join("; ", result.Errors.Select(e => e.Description)));

    internal static Error CannotDeleteLastAdmin() =>
        Error.Conflict("Cannot delete the last admin user.");

    internal static Error CannotDemoteLastAdmin() =>
        Error.Conflict("Cannot demote the last admin user.");
}

internal static class UserQueries
{
    internal static async Task<bool> IsLastAdminAsync(
        IFlagsweepDbContext db,
        ApplicationUser user,
        CancellationToken ct
    ) =>
        user.Role == Roles.Admin
        && !await db.Users.AnyAsync(u => u.Role == Roles.Admin && u.Id != user.Id, ct);
}
