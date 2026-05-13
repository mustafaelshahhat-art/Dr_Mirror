using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Cart.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Cart.MergeCart;

public static class MergeCartEndpoint
{
    public static RouteGroupBuilder MapMergeCart(this RouteGroupBuilder group)
    {
        group.MapPost("/merge", HandleAsync)
            .WithName("Cart.MergeCart")
            .WithSummary("Fold a guest cart (from localStorage) into the signed-in user's server cart.")
            .RequireAuthorization()
            .WithValidation<MergeCartRequest>()
            .Produces<CartDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        MergeCartRequest request,
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

        // Resolve all referenced variants in a single round-trip; silently
        // drop ones that aren't available anymore (deleted, unpublished,
        // disabled, out-of-stock category). The merge call is best-effort —
        // the SPA will reflect the cleaned cart in the response.
        var ids = request.Items.Select(i => i.ProductVariantId).Distinct().ToList();
        var variants = await db.ProductVariants
            .Include(v => v.Product)
                .ThenInclude(p => p!.Category)
            .Where(v => ids.Contains(v.Id)
                && v.IsActive
                && v.Product!.IsPublished
                && v.Product.Category!.IsActive)
            .ToDictionaryAsync(v => v.Id, ct);

        var existingLines = await db.CartItems
            .Where(i => i.CartId == cart.Id)
            .ToDictionaryAsync(i => i.ProductVariantId, ct);

        foreach (var line in request.Items)
        {
            if (!variants.TryGetValue(line.ProductVariantId, out var variant)) continue;

            var price = variant.Product!.Price;

            if (existingLines.TryGetValue(variant.Id, out var existing))
            {
                // Per merge rule: same variant → increment, capped at limits + variant stock.
                var combined = existing.Quantity + line.Quantity;
                var capped = Math.Min(
                    Math.Min(combined, CartLimits.MaxQuantityPerLine),
                    variant.Stock);
                existing.Quantity = Math.Max(capped, 1);
                existing.UnitPriceSnapshot = price;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                var qty = Math.Min(
                    Math.Min(line.Quantity, CartLimits.MaxQuantityPerLine),
                    variant.Stock);
                if (qty <= 0) continue;
                db.CartItems.Add(new CartItem
                {
                    Id = Guid.NewGuid(),
                    CartId = cart.Id,
                    ProductVariantId = variant.Id,
                    Quantity = qty,
                    UnitPriceSnapshot = price,
                });
            }
        }

        cart.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var dto = await cartService.ToDtoAsync(cart.Id, ct);
        return Results.Ok(dto);
    }
}
