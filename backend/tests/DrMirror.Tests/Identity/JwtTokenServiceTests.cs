using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace DrMirror.Tests.Identity;

public class JwtTokenServiceTests
{
    private static JwtTokenService CreateService(JwtOptions? overrides = null)
    {
        var options = overrides ?? new JwtOptions
        {
            Issuer = "drmirror.test",
            Audience = "drmirror.test",
            // 32-char minimum required by the options validator.
            Secret = "test-secret-key-thirty-two-chars!!-padding-padding",
            AccessTokenLifetimeMinutes = 15,
            RefreshTokenLifetimeDays = 14,
        };
        return new JwtTokenService(Options.Create(options));
    }

    private static User CreateUser() => new()
    {
        Id = Guid.Parse("11111111-2222-3333-4444-555555555555"),
        Email = "test@drmirror.local",
        UserName = "test@drmirror.local",
        FullName = "Test User",
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow,
    };

    // -------------------------------------------------------------------------
    // CreateAccessToken
    // -------------------------------------------------------------------------

    [Fact]
    public void CreateAccessToken_emits_sub_email_and_role_claims()
    {
        var service = CreateService();
        var user = CreateUser();
        user.SecurityStamp = "stamp-1";

        var result = service.CreateAccessToken(user, new[] { UserRoles.Admin });

        Assert.False(string.IsNullOrEmpty(result.Token));
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(result.Token);
        Assert.Equal(user.Id.ToString(), jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Sub).Value);
        Assert.Equal(user.Email, jwt.Claims.Single(c => c.Type == JwtRegisteredClaimNames.Email).Value);
        Assert.Equal(user.SecurityStamp, jwt.Claims.Single(c => c.Type == JwtTokenService.SecurityStampClaimType).Value);
        Assert.Contains(jwt.Claims, c => c.Type == ClaimTypes.Role && c.Value == UserRoles.Admin);
    }

    [Fact]
    public void CreateAccessToken_lifetime_matches_options()
    {
        var service = CreateService(new JwtOptions
        {
            Issuer = "x",
            Audience = "x",
            Secret = "test-secret-key-thirty-two-chars!!-padding-padding",
            AccessTokenLifetimeMinutes = 5,
        });

        var before = DateTimeOffset.UtcNow;
        var result = service.CreateAccessToken(CreateUser(), Array.Empty<string>());
        var after = DateTimeOffset.UtcNow;

        var lower = before.AddMinutes(5).AddSeconds(-2);
        var upper = after.AddMinutes(5).AddSeconds(2);
        Assert.InRange(result.ExpiresAt, lower, upper);
    }

    [Fact]
    public void CreateAccessToken_can_be_validated_with_the_same_secret()
    {
        var options = new JwtOptions
        {
            Issuer = "drmirror.test",
            Audience = "drmirror.test",
            Secret = "test-secret-key-thirty-two-chars!!-padding-padding",
        };
        var service = CreateService(options);
        var token = service.CreateAccessToken(CreateUser(), new[] { UserRoles.Buyer }).Token;

        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = options.Issuer,
            ValidAudience = options.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Secret)),
            ClockSkew = TimeSpan.FromSeconds(30),
        };

        var principal = handler.ValidateToken(token, parameters, out _);
        Assert.True(principal.Identity?.IsAuthenticated);
        Assert.Contains(principal.Claims, c => c.Type == ClaimTypes.Role && c.Value == UserRoles.Buyer);
    }

    [Fact]
    public void CreateAccessToken_rejects_when_validated_with_a_different_secret()
    {
        var issued = CreateService(new JwtOptions
        {
            Issuer = "drmirror.test",
            Audience = "drmirror.test",
            Secret = "secret-A-thirty-two-chars-padding-padding-padding",
        }).CreateAccessToken(CreateUser(), Array.Empty<string>()).Token;

        var handler = new JwtSecurityTokenHandler();
        var parameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes("secret-B-thirty-two-chars-padding-padding-padding")),
        };

        Assert.Throws<SecurityTokenSignatureKeyNotFoundException>(
            () => handler.ValidateToken(issued, parameters, out _));
    }

    // -------------------------------------------------------------------------
    // CreateRefreshToken + HashRefreshToken
    // -------------------------------------------------------------------------

    [Fact]
    public void CreateRefreshToken_returns_unique_tokens()
    {
        var service = CreateService();

        var seen = new HashSet<string>();
        for (var i = 0; i < 200; i++)
        {
            var minted = service.CreateRefreshToken();
            Assert.True(seen.Add(minted.RawToken), "Duplicate token generated within 200 iterations — entropy too low.");
            Assert.Equal(service.HashRefreshToken(minted.RawToken), minted.TokenHash);
        }
    }

    [Fact]
    public void HashRefreshToken_is_deterministic()
    {
        var service = CreateService();
        const string token = "abcDEF123!@#";

        var hash1 = service.HashRefreshToken(token);
        var hash2 = service.HashRefreshToken(token);

        Assert.Equal(hash1, hash2);
        Assert.Equal(64, hash1.Length); // SHA-256 hex
    }

    [Fact]
    public void HashRefreshToken_differs_for_distinct_inputs()
    {
        var service = CreateService();
        Assert.NotEqual(service.HashRefreshToken("token-a"), service.HashRefreshToken("token-b"));
    }

    [Fact]
    public void CreateRefreshToken_expiry_respects_options()
    {
        var service = CreateService(new JwtOptions
        {
            Issuer = "x",
            Audience = "x",
            Secret = "test-secret-key-thirty-two-chars!!-padding-padding",
            RefreshTokenLifetimeDays = 7,
        });

        var before = DateTimeOffset.UtcNow;
        var minted = service.CreateRefreshToken();
        var after = DateTimeOffset.UtcNow;

        Assert.InRange(minted.ExpiresAt, before.AddDays(7).AddSeconds(-2), after.AddDays(7).AddSeconds(2));
    }
}
