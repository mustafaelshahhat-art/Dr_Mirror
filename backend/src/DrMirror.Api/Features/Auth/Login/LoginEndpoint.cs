using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Shared.RateLimiting;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Auth.Login;

public sealed record LoginRequest(string Email, string Password);

public sealed class LoginValidator : AbstractValidator<LoginRequest>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(254);
        RuleFor(x => x.Password).NotEmpty().MaximumLength(128);
    }
}

public static class LoginEndpoint
{
    public static RouteGroupBuilder MapLogin(this RouteGroupBuilder group)
    {
        group.MapPost("/login", HandleAsync)
            .WithName("Login")
            .WithSummary("Exchange email + password for an access token + refresh cookie.")
            .RequireRateLimiting(RateLimitPolicies.AuthStrict)
            .WithValidation<LoginRequest>()
            .Produces<AuthResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        LoginRequest request,
        UserManager<User> userManager,
        SignInManager<User> signInManager,
        IJwtTokenService jwt,
        RefreshTokenIssuer refresh,
        RefreshCookieWriter cookie,
        HttpContext http,
        CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        // Constant-message 401 — never reveal whether the email exists.
        if (user is null) return InvalidCredentials();

        if (user.IsDisabled)
        {
            return Results.Problem(
                title: "Account disabled",
                detail: "This account has been disabled. Contact support.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var check = await signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (check.IsLockedOut)
        {
            return Results.Problem(
                title: "Account temporarily locked",
                detail: "Too many failed sign-in attempts. Please try again later.",
                statusCode: StatusCodes.Status423Locked);
        }
        if (!check.Succeeded) return InvalidCredentials();

        var roles = await userManager.GetRolesAsync(user);
        var access = jwt.CreateAccessToken(user, roles);
        var refreshToken = await refresh.IssueAsync(user.Id, http.Connection.RemoteIpAddress?.ToString(), ct);
        cookie.Write(http.Response, refreshToken.RawToken, refreshToken.ExpiresAt);

        var body = new AuthResponse(access.Token, access.ExpiresAt, UserDtoMapper.ToDto(user, roles));
        return Results.Ok(body);
    }

    private static IResult InvalidCredentials() =>
        Results.Problem(
            title: "Invalid credentials",
            detail: "The email or password you entered is incorrect.",
            statusCode: StatusCodes.Status401Unauthorized);
}
