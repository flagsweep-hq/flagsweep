using System.Security.Claims;
using Flagsweep.Application.Users;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace Flagsweep.Infrastructure.Authentication;

public class AppClaimsPrincipalFactory(
    UserManager<ApplicationUser> userManager,
    IOptions<IdentityOptions> optionsAccessor
) : UserClaimsPrincipalFactory<ApplicationUser>(userManager, optionsAccessor)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(ApplicationUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim(ClaimTypes.Role, user.Role));
        return identity;
    }
}
