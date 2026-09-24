namespace Flagsweep.Application.Authentication;

public enum AuthType
{
    Password,
}

public class AuthOptions
{
    public const string SectionName = "Auth";

    public AuthType Type { get; set; } = AuthType.Password;
    public PasswordRuleOptions Password { get; set; } = new();

    public class PasswordRuleOptions
    {
        public int RequiredLength { get; set; } = 6;
        public bool RequireDigit { get; set; }
        public bool RequireLowercase { get; set; }
        public bool RequireUppercase { get; set; }
        public bool RequireNonAlphanumeric { get; set; }
    }
}
