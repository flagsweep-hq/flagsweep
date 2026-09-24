namespace Flagsweep.Domain;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Member = "Member";

    public static bool IsValid(string? role) => role is Admin or Member;
}
