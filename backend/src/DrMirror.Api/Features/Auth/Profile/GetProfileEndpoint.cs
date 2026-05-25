using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Shared.RateLimiting;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Auth.Profile;

public static class GetProfileEndpoint
{
    public static RouteGroupBuilder MapProfileEndpoints(this RouteGroupBuilder group)
    {
        group.MapGet("/profile", HandleAsync)
            .WithName("Account.GetProfile")
            .WithSummary("Return the authenticated customer's account profile.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .Produces<GetProfileResponse>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        group.MapPatch("/profile", PatchProfileEndpoint.HandleAsync)
            .WithName("Account.PatchProfile")
            .WithSummary("Update the authenticated customer's display name and phone.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.AddressBook)
            .WithValidation<PatchProfileRequest>()
            .Produces<GetProfileResponse>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ICurrentUser current,
        UserManager<User> userManager)
    {
        if (current.UserId is not { } userId) return Results.Unauthorized();

        var user = await userManager.FindByIdAsync(userId.ToString());
        return user is null || user.IsDisabled
            ? Results.Unauthorized()
            : Results.Ok(ToResponse(user));
    }

    internal static GetProfileResponse ToResponse(User user) => new(
        user.FullName,
        user.Email ?? string.Empty,
        user.PhoneNumber,
        !string.IsNullOrWhiteSpace(user.PhoneNumber) && user.PhoneNumberConfirmed,
        user.PhoneVerifiedAt);
}
