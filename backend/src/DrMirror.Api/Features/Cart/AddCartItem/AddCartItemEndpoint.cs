using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.RateLimiting;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Cart.AddCartItem;

public static class AddCartItemEndpoint
{
    public static RouteGroupBuilder MapAddCartItem(this RouteGroupBuilder group)
    {
        group.MapPost("/items", HandleAsync)
            .WithName("Cart.AddCartItem")
            .WithSummary("Add a variant to the cart, or increment its quantity if it already exists there.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.CartMutation)
            .WithValidation<AddCartItemRequest>()
            .Produces<CartDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AddCartItemRequest request,
        ICurrentUser current,
        [FromServices] CartService cartService,
        AppDbContext db,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var variant = await cartService.FindVariantForBuyerAsync(request.ProductVariantId, ct);
        if (variant is null)
        {
            return Results.Problem(
                title: "Variant not available",
                detail: "This size/colour is not currently available.",
                statusCode: StatusCodes.Status404NotFound);
        }

        var cart = await cartService.GetOrCreateCartAsync(userId, ct);

        // Existing line? Increment, capped at the per-line limit.
        var existing = await db.CartItems
            .FirstOrDefaultAsync(i => i.CartId == cart.Id && i.ProductVariantId == variant.Id, ct);

        if (existing is not null)
        {
            var newQty = existing.Quantity + request.Quantity;
            if (newQty > CartLimits.MaxQuantityPerLine)
            {
                return Results.Problem(
                    title: "Per-line limit reached",
                    detail: $"You may not have more than {CartLimits.MaxQuantityPerLine} of the same item in your cart.",
                    statusCode: StatusCodes.Status409Conflict);
            }
            if (newQty > variant.Stock)
            {
                return Results.Problem(
                    title: "Insufficient stock",
                    detail: $"Only {variant.Stock} of this size/colour are available.",
                    statusCode: StatusCodes.Status409Conflict);
            }
            existing.Quantity = newQty;
            existing.UnitPriceSnapshot = variant.Product!.Price;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            if (request.Quantity > variant.Stock)
            {
                return Results.Problem(
                    title: "Insufficient stock",
                    detail: $"Only {variant.Stock} of this size/colour are available.",
                    statusCode: StatusCodes.Status409Conflict);
            }
            db.CartItems.Add(new CartItem
            {
                Id = Guid.NewGuid(),
                CartId = cart.Id,
                ProductVariantId = variant.Id,
                Quantity = request.Quantity,
                UnitPriceSnapshot = variant.Product!.Price,
            });
        }

        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var dto = await cartService.ToDtoAsync(cart.Id, ct);
        return Results.Ok(dto);
    }
}
