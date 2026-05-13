using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Cart.UpdateCartItem;

public static class UpdateCartItemEndpoint
{
    public static RouteGroupBuilder MapUpdateCartItem(this RouteGroupBuilder group)
    {
        group.MapPatch("/items/{cartItemId:guid}", HandleAsync)
            .WithName("Cart.UpdateCartItem")
            .WithSummary("Set the absolute quantity of an existing cart line.")
            .RequireAuthorization()
            .WithValidation<UpdateCartItemRequest>()
            .Produces<CartDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        Guid cartItemId,
        UpdateCartItemRequest request,
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

        // Owner check: the line must belong to the caller's cart.
        var line = await db.CartItems
            .Include(i => i.ProductVariant)
                .ThenInclude(v => v!.Product)
            .FirstOrDefaultAsync(i => i.Id == cartItemId && i.CartId == cart.Id, ct);

        if (line is null)
        {
            return Results.Problem(
                title: "Cart line not found",
                statusCode: StatusCodes.Status404NotFound);
        }

        var variant = line.ProductVariant!;
        if (request.Quantity > variant.Stock)
        {
            return Results.Problem(
                title: "Insufficient stock",
                detail: $"Only {variant.Stock} of this size/colour are available.",
                statusCode: StatusCodes.Status409Conflict);
        }

        line.Quantity = request.Quantity;
        line.UnitPriceSnapshot = variant.Product!.Price;
        line.UpdatedAt = DateTimeOffset.UtcNow;

        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var dto = await cartService.ToDtoAsync(cart.Id, ct);
        return Results.Ok(dto);
    }
}
