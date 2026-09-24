using Flagsweep.Domain.Models;

namespace Flagsweep.UnitTests.Domain;

public class InvitationTests
{
    private static readonly DateTime Now = new(2026, 4, 20, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Create_SetsEmailLowercase()
    {
        var invitation = Invitation.Create("Admin@Example.COM", "Member", Now);

        invitation.Email.Should().Be("admin@example.com");
    }

    [Fact]
    public void Create_GeneratesNonEmptyToken()
    {
        var invitation = Invitation.Create("test@test.com", "Member", Now);

        invitation.Token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void Create_GeneratesUniqueTokens()
    {
        var first = Invitation.Create("test@test.com", "Member", Now);
        var second = Invitation.Create("test@test.com", "Member", Now);

        first.Token.Should().NotBe(second.Token);
    }

    [Fact]
    public void Create_TokenIsUrlSafe()
    {
        var invitation = Invitation.Create("test@test.com", "Member", Now);

        invitation.Token.Should().NotContain("+");
        invitation.Token.Should().NotContain("/");
        invitation.Token.Should().NotContain("=");
    }

    [Fact]
    public void Create_SetsExpirationInFuture()
    {
        var invitation = Invitation.Create("test@test.com", "Member", Now);

        invitation.ExpiresAt.Should().BeAfter(Now);
    }

    [Fact]
    public void Create_CustomExpirationDays()
    {
        var invitation = Invitation.Create("test@test.com", "Member", Now, expirationDays: 1);

        invitation.ExpiresAt.Should().Be(Now.AddDays(1));
    }
}
