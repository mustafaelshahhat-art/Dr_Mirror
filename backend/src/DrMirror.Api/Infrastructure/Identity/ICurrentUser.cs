namespace DrMirror.Api.Infrastructure.Identity;

/// <summary>
/// Per-request abstraction over <c>HttpContext.User</c>. Inject this anywhere
/// you'd otherwise reach for <c>IHttpContextAccessor</c> just to read claims.
/// </summary>
public interface ICurrentUser
{
    /// <summary><c>true</c> iff the request carries a valid JWT.</summary>
    bool IsAuthenticated { get; }

    /// <summary>The authenticated user's Id, or <c>null</c> if unauthenticated.</summary>
    Guid? UserId { get; }

    /// <summary>The authenticated user's email, or <c>null</c>.</summary>
    string? Email { get; }

    /// <summary>Roles asserted by the JWT.</summary>
    IReadOnlyList<string> Roles { get; }
}
