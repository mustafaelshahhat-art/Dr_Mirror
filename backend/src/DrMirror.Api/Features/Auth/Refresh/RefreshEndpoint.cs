using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.RateLimiting;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Auth.Refresh;

public static class RefreshEndpoint
{
    public static RouteGroupBuilder MapRefresh(this RouteGroupBuilder group)
    {
        group.MapPost("/refresh", HandleAsync)
            .WithName("Refresh")
            .WithSummary("Rotate the refresh cookie and return a fresh access token.")
            .RequireRateLimiting(RateLimitPolicies.AuthRefresh)
            .Produces<AuthResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        RefreshCookieWriter cookie,
        IJwtTokenService jwt,
        RefreshTokenIssuer refresh,
        AppDbContext db,
        UserManager<User> userManager,
        HttpContext http,
        CancellationToken ct)
    {
        var raw = cookie.Read(http.Request);
        if (string.IsNullOrEmpty(raw))
        {
            return UnauthorizedAndClear(cookie, http);
        }

        var hash = jwt.HashRefreshToken(raw);
        var row = await db.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.TokenHash == hash, ct);

        if (row is null)
        {
            // Unknown token — the cookie is stale or forged. Clear it.
            return UnauthorizedAndClear(cookie, http);
        }

        if (!row.IsActive)
        {
            // Token reuse detection: if we received a revoked/expired token,
            // assume credential theft and revoke ALL outstanding tokens for
            // this user. They'll need to log in again on every device.
            if (row.RevokedAt is not null)
            {
                var siblings = await db.RefreshTokens
                    .Where(rt => rt.UserId == row.UserId && rt.RevokedAt == null)
                    .ToListAsync(ct);
                var now = DateTimeOffset.UtcNow;
                foreach (var s in siblings)
                {
                    s.RevokedAt = now;
                    s.RevokedByIp = http.Connection.RemoteIpAddress?.ToString();
                }
                await db.SaveChangesAsync(ct);
            }

            return UnauthorizedAndClear(cookie, http);
        }

        if (row.User is null || row.User.IsDisabled)
        {
            return UnauthorizedAndClear(cookie, http);
        }

        // Happy path — rotate.
        var rotated = await refresh.RotateAsync(row, http.Connection.RemoteIpAddress?.ToString(), ct);
        cookie.Write(http.Response, rotated.RawToken, rotated.ExpiresAt);

        var roles = await userManager.GetRolesAsync(row.User);
        var access = jwt.CreateAccessToken(row.User, roles);
        return Results.Ok(new AuthResponse(access.Token, access.ExpiresAt, UserDtoMapper.ToDto(row.User, roles)));
    }

    private static IResult UnauthorizedAndClear(RefreshCookieWriter cookie, HttpContext http)
    {
        cookie.Clear(http.Response);
        return Results.Problem(
            title: "Session expired",
            detail: "Your session has expired. Please sign in again.",
            statusCode: StatusCodes.Status401Unauthorized);
    }
}
