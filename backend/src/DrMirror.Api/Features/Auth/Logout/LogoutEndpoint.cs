using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Auth.Logout;

public static class LogoutEndpoint
{
    public static RouteGroupBuilder MapLogout(this RouteGroupBuilder group)
    {
        group.MapPost("/logout", HandleAsync)
            .WithName("Logout")
            .WithSummary("Revoke the current refresh token and clear its cookie.")
            .Produces(StatusCodes.Status204NoContent);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        RefreshCookieWriter cookie,
        IJwtTokenService jwt,
        AppDbContext db,
        HttpContext http,
        CancellationToken ct)
    {
        var raw = cookie.Read(http.Request);
        if (!string.IsNullOrEmpty(raw))
        {
            var hash = jwt.HashRefreshToken(raw);
            var row = await db.RefreshTokens.FirstOrDefaultAsync(rt => rt.TokenHash == hash, ct);
            if (row is not null && row.RevokedAt is null)
            {
                row.RevokedAt = DateTimeOffset.UtcNow;
                row.RevokedByIp = http.Connection.RemoteIpAddress?.ToString();
                await db.SaveChangesAsync(ct);
            }
        }

        // Always clear, regardless of whether the cookie was valid.
        cookie.Clear(http.Response);
        return Results.NoContent();
    }
}
