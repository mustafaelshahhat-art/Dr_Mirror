using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Auth.Register;

public sealed record RegisterRequest(string Email, string Password, string FullName);

public sealed class RegisterValidator : AbstractValidator<RegisterRequest>
{
    public RegisterValidator()
    {
        // Email: standard RFC-ish check; allow up to 254 chars per RFC 3696.
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254);

        // Password: minimum 8 chars; mix of lower+upper+digit is enforced by
        // Identity options (Program.cs). Keep this rule symmetric with the
        // frontend zod schema (locales/auth.json messages reference it).
        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(128);

        RuleFor(x => x.FullName)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(120);
    }
}

public static class RegisterEndpoint
{
    public static RouteGroupBuilder MapRegister(this RouteGroupBuilder group)
    {
        group.MapPost("/register", HandleAsync)
            .WithName("Register")
            .WithSummary("Create a new Buyer account and sign in immediately.")
            .WithValidation<RegisterRequest>()
            .Produces<AuthResponse>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        RegisterRequest request,
        UserManager<User> userManager,
        IJwtTokenService jwt,
        RefreshTokenIssuer refresh,
        RefreshCookieWriter cookie,
        HttpContext http,
        CancellationToken ct)
    {
        // Reject duplicate email up front so we return a clean 409 instead of
        // letting Identity throw a generic "DuplicateUserName" error string.
        var existing = await userManager.FindByEmailAsync(request.Email);
        if (existing is not null)
        {
            return Results.Problem(
                title: "Email already registered",
                detail: "An account with this email address already exists.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            FullName = request.FullName.Trim(),
            EmailConfirmed = true, // M1 policy: immediate-confirm (no SMTP yet)
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

        var create = await userManager.CreateAsync(user, request.Password);
        if (!create.Succeeded)
        {
            return Results.ValidationProblem(
                errors: create.Errors
                    .GroupBy(e => MapIdentityErrorToField(e.Code))
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()),
                title: "Account creation failed");
        }

        // Default role is Buyer; admin can promote later.
        await userManager.AddToRoleAsync(user, UserRoles.Buyer);

        var roles = await userManager.GetRolesAsync(user);
        var access = jwt.CreateAccessToken(user, roles);
        var refreshToken = await refresh.IssueAsync(user.Id, http.Connection.RemoteIpAddress?.ToString(), ct);
        cookie.Write(http.Response, refreshToken.RawToken, refreshToken.ExpiresAt);

        var body = new AuthResponse(access.Token, access.ExpiresAt, UserDtoMapper.ToDto(user, roles));
        return Results.Created($"/api/users/{user.Id}", body);
    }

    private static string MapIdentityErrorToField(string code) => code switch
    {
        // Bucket Identity error codes back to request fields so the frontend
        // can show errors inline next to the offending input.
        "PasswordTooShort" or "PasswordRequiresDigit" or "PasswordRequiresLower"
            or "PasswordRequiresUpper" or "PasswordRequiresNonAlphanumeric"
            or "PasswordRequiresUniqueChars" => nameof(RegisterRequest.Password),
        "InvalidEmail" or "DuplicateEmail" or "DuplicateUserName" => nameof(RegisterRequest.Email),
        _ => string.Empty,
    };
}
