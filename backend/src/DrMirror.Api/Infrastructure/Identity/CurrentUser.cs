using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace DrMirror.Api.Infrastructure.Identity;

/// <summary>
/// Scoped implementation of <see cref="ICurrentUser"/>. Reads from the JWT-bearer
/// <c>HttpContext.User</c> populated by ASP.NET Core's authentication middleware.
/// </summary>
public sealed class CurrentUser : ICurrentUser
{
    private readonly ClaimsPrincipal _principal;

    public CurrentUser(IHttpContextAccessor accessor)
    {
        _principal = accessor.HttpContext?.User ?? new ClaimsPrincipal();
    }

    public bool IsAuthenticated => _principal.Identity?.IsAuthenticated == true;

    public Guid? UserId
    {
        get
        {
            var sub = _principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                      ?? _principal.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public string? Email =>
        _principal.FindFirstValue(JwtRegisteredClaimNames.Email)
        ?? _principal.FindFirstValue(ClaimTypes.Email);

    public IReadOnlyList<string> Roles =>
        _principal.FindAll(ClaimTypes.Role).Select(c => c.Value).ToArray();
}
