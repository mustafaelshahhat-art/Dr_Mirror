using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Auth.Me;

public sealed record UpdateMeRequest(string? DisplayName, string? Phone);

public sealed class UpdateMeValidator : AbstractValidator<UpdateMeRequest>
{
    private static readonly System.Text.RegularExpressions.Regex PhoneRegex =
        new(@"^\+?[0-9\s\-]{7,20}$", System.Text.RegularExpressions.RegexOptions.Compiled);

    public UpdateMeValidator()
    {
        RuleFor(x => x.DisplayName)
            .MinimumLength(2)
            .MaximumLength(120)
            .When(x => x.DisplayName is not null);

        RuleFor(x => x.Phone)
            .MaximumLength(30)
            .Must(p => string.IsNullOrWhiteSpace(p) || PhoneRegex.IsMatch(p.Trim()))
            .WithMessage("Phone number is not valid.");

    }
}

public static class MeEndpoint
{
    public static RouteGroupBuilder MapMe(this RouteGroupBuilder group)
    {
        group.MapGet("/me", HandleAsync)
            .WithName("Me")
            .WithSummary("Return the currently authenticated user.")
            .RequireAuthorization()
            .Produces<UserDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPut("/me", UpdateAsync)
            .WithName("Auth.UpdateMe")
            .WithSummary("Update the caller's safe profile fields.")
            .RequireAuthorization()
            .WithValidation<UpdateMeRequest>()
            .Produces<UserDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ICurrentUser current,
        UserManager<User> userManager)
    {
        // ICurrentUser cannot return null UserId for an authorized endpoint —
        // but be defensive: a token with a malformed sub claim would slip past
        // authorization yet still fail this lookup. Map to 401 for safety.
        if (current.UserId is not Guid id)
        {
            return Results.Problem(
                title: "Invalid token",
                detail: "The access token does not identify a known user.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null || user.IsDisabled)
        {
            return Results.Problem(
                title: "Account not found",
                detail: "Your account could not be located. Please sign in again.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var roles = await userManager.GetRolesAsync(user);
        return Results.Ok(UserDtoMapper.ToDto(user, roles));
    }

    private static async Task<IResult> UpdateAsync(
        UpdateMeRequest request,
        ICurrentUser current,
        UserManager<User> userManager)
    {
        if (current.UserId is not Guid id)
        {
            return Results.Problem(
                title: "Invalid token",
                detail: "The access token does not identify a known user.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var user = await userManager.FindByIdAsync(id.ToString());
        if (user is null || user.IsDisabled)
        {
            return Results.Problem(
                title: "Account not found",
                detail: "Your account could not be located. Please sign in again.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        if (request.DisplayName is not null)
        {
            user.FullName = request.DisplayName.Trim();
        }

        if (request.Phone is not null)
        {
            var phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
            if (!string.Equals(user.PhoneNumber, phone, StringComparison.Ordinal))
            {
                user.PhoneNumber = phone;
                user.PhoneNumberConfirmed = false;
                user.PhoneVerifiedAt = null;
            }
        }

        user.UpdatedAt = DateTimeOffset.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(
                result.Errors
                    .GroupBy(e => string.Empty)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()),
                title: "Profile update failed");
        }

        var roles = await userManager.GetRolesAsync(user);
        return Results.Ok(UserDtoMapper.ToDto(user, roles));
    }
}
