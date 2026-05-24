using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Cart.ClearCart;

public static class ClearCartEndpoint
{
    public static RouteGroupBuilder MapClearCart(this RouteGroupBuilder group)
    {
        group.MapPost("/clear", HandleAsync)
            .WithName("Cart.ClearCart")
            .WithSummary("Remove every line from the cart, leaving the empty cart in place.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.CartMutation)
            .Produces<CartDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
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

        var lines = await db.CartItems
            .Where(i => i.CartId == cart.Id)
            .ToListAsync(ct);

        if (lines.Count > 0)
        {
            db.CartItems.RemoveRange(lines);
            cart.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        var dto = await cartService.ToDtoAsync(cart.Id, ct);
        return Results.Ok(dto);
    }
}
