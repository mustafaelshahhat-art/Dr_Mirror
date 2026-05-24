using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Infrastructure.Identity;
using Microsoft.AspNetCore.Mvc;

namespace DrMirror.Api.Features.Cart.GetMyCart;

public static class GetMyCartEndpoint
{
    public static RouteGroupBuilder MapGetMyCart(this RouteGroupBuilder group)
    {
        group.MapGet("/", HandleAsync)
            .WithName("Cart.GetMyCart")
            .WithSummary("Return the signed-in buyer's cart, creating an empty one if none exists.")
            .RequireAuthorization()
            .Produces<CartDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        ICurrentUser current,
        [FromServices] CartService cartService,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var cart = await cartService.GetOrCreateCartAsync(userId, ct, trackExisting: false);
        var dto = await cartService.ToDtoAsync(cart.Id, ct);
        return Results.Ok(dto);
    }
}
