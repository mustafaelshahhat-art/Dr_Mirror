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

        // Fold duplicate variantIds in the request — the client may send the
        // same SKU twice (separate add events). Without this dedupe the loop
        // below would issue two INSERTs and the unique (CartId, VariantId)
        // index would 500 the request.
        var requestedByVariant = request.Items
            .GroupBy(i => i.ProductVariantId)
            .ToDictionary(g => g.Key, g => g.Sum(i => i.Quantity));

        // Resolve all referenced variants in a single round-trip; silently
        // drop ones that aren't available anymore (deleted, unpublished,
        // disabled, out-of-stock category). The merge call is best-effort —
        // the SPA will reflect the cleaned cart in the response.
        var ids = requestedByVariant.Keys.ToList();
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

        foreach (var (variantId, requestedQty) in requestedByVariant)
        {
            if (!variants.TryGetValue(variantId, out var variant)) continue;

            var price = variant.Product!.Price;

            if (existingLines.TryGetValue(variantId, out var existing))
            {
                var combined = existing.Quantity + requestedQty;
                var capped = Math.Min(
                    Math.Min(combined, CartLimits.MaxQuantityPerLine),
                    variant.Stock);

                if (capped <= 0)
                {
                    // The variant is no longer stocked. Drop the existing line
                    // rather than silently forcing it back to quantity 1.
                    db.CartItems.Remove(existing);
                    continue;
                }

                existing.Quantity = capped;
                existing.UnitPriceSnapshot = price;
                existing.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                var qty = Math.Min(
                    Math.Min(requestedQty, CartLimits.MaxQuantityPerLine),
                    variant.Stock);
                if (qty <= 0) continue;
                db.CartItems.Add(new CartItem
                {
                    Id = Guid.NewGuid(),
                    CartId = cart.Id,
                    ProductVariantId = variantId,
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
