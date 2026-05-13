using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Auth.Common;
using DrMirror.Api.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Api.Features.Auth.Me;

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
}
