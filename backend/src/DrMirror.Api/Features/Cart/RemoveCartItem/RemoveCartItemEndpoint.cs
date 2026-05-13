using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Cart.RemoveCartItem;

public static class RemoveCartItemEndpoint
{
    public static RouteGroupBuilder MapRemoveCartItem(this RouteGroupBuilder group)
    {
        group.MapDelete("/items/{cartItemId:guid}", HandleAsync)
            .WithName("Cart.RemoveCartItem")
            .WithSummary("Remove a line from the cart.")
            .RequireAuthorization()
            .Produces<CartDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        Guid cartItemId,
        ICurrentUser current,
        [FromServices] CartService cartService,
        AppDbContext db,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var cart = await cartService.GetOrCreateCartAsync(userId, ct);

        var line = await db.CartItems
            .FirstOrDefaultAsync(i => i.Id == cartItemId && i.CartId == cart.Id, ct);

        if (line is null)
        {
            return Results.Problem(
                title: "Cart line not found",
                statusCode: StatusCodes.Status404NotFound);
        }

        db.CartItems.Remove(line);
        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var dto = await cartService.ToDtoAsync(cart.Id, ct);
        return Results.Ok(dto);
    }
}
