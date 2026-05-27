using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Auth.Me;

public sealed record UpdateMeRequest(string? DisplayName, string? Phone, string? Email);

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
            .Must(p => string.IsNullOrWhiteSpace(p) || PhoneRegex.IsMatch(p))
            .WithMessage("Phone number is not valid.")
            .When(x => x.Phone is not null);

        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(254)
            .When(x => x.Email is not null);
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

        group.MapDelete("/me/phone", DeletePhoneAsync)
            .WithName("Auth.DeletePhone")
            .WithSummary("Remove the authenticated customer's phone number and reset verification status.")
            .RequireAuthorization()
            .Produces<UserDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

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
            var newPhone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
            if (newPhone != user.PhoneNumber)
            {
                user.PhoneNumber = newPhone;
                user.PhoneNumberConfirmed = false;
            }
        }

        if (request.Email is not null)
        {
            var trimmedEmail = request.Email.Trim();
            if (!string.Equals(trimmedEmail, user.Email, StringComparison.OrdinalIgnoreCase))
            {
                var existing = await userManager.FindByEmailAsync(trimmedEmail);
                if (existing is not null && existing.Id != user.Id)
                {
                    return Results.Problem(
                        title: "Email already in use",
                        detail: "This email address is already associated with another account.",
                        statusCode: StatusCodes.Status409Conflict);
                }
                user.Email = trimmedEmail;
                user.NormalizedEmail = userManager.NormalizeEmail(trimmedEmail);
                user.UserName = trimmedEmail;
                user.NormalizedUserName = userManager.NormalizeName(trimmedEmail);
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

    private static async Task<IResult> DeletePhoneAsync(
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

        if (string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            return Results.Problem(
                title: "No phone number to delete",
                detail: "Your account does not have a saved phone number.",
                statusCode: StatusCodes.Status404NotFound);
        }

        user.PhoneNumber = null;
        user.PhoneNumberConfirmed = false;
        user.UpdatedAt = DateTimeOffset.UtcNow;

        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            return Results.ValidationProblem(
                result.Errors
                    .GroupBy(e => string.Empty)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()),
                title: "Phone removal failed");
        }

        var roles = await userManager.GetRolesAsync(user);
        return Results.Ok(UserDtoMapper.ToDto(user, roles));
    }
}
