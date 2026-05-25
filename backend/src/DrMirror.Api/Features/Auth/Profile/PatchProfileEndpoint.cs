using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure;
using DrMirror.Api.Infrastructure.Identity;
using FluentValidation;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Auth.Profile;

public sealed class PatchProfileValidator : AbstractValidator<PatchProfileRequest>
{
    public PatchProfileValidator()
    {
        RuleFor(x => x)
            .Must(x => x.FullName is not null || x.PhoneNumber is not null)
            .WithMessage("At least one profile field must be provided.");

        RuleFor(x => x.FullName)
            .Must(v => !string.IsNullOrWhiteSpace(v))
            .WithMessage("Full name is required.")
            .MinimumLength(2)
            .MaximumLength(120)
            .When(x => x.FullName is not null);

        RuleFor(x => x.PhoneNumber)
            .Must(v => v is not null && PhoneNormalizer.IsValidEgyptianLocal(v))
            .WithMessage("Phone number must be 11 digits and start with 010, 011, 012, or 015.")
            .When(x => x.PhoneNumber is not null);
    }
}

public static class PatchProfileEndpoint
{
    internal static async Task<IResult> HandleAsync(
        PatchProfileRequest request,
        ICurrentUser current,
        UserManager<User> userManager)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();

        var user = await userManager.FindByIdAsync(userId.ToString());
        if (user is null || user.IsDisabled) return Results.Unauthorized();

        if (request.FullName is not null)
        {
            user.FullName = request.FullName.Trim();
        }

        if (request.PhoneNumber is not null)
        {
            var phone = request.PhoneNumber.Trim();
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

        return Results.Ok(GetProfileEndpoint.ToResponse(user));
    }
}
