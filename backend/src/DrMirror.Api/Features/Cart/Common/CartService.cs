using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Cart.Common;

/// <summary>
/// Shared cart-shaping helpers used by every endpoint in the slice. Centralised
/// so all reads return identical projection shape and rules ("line dedup",
/// "current price", etc.) live in exactly one place.
/// </summary>
internal sealed class CartService
{
    private readonly AppDbContext _db;

    public CartService(AppDbContext db) => _db = db;

    /// <summary>Find or create the open cart for the given user.</summary>
    public async Task<Domain.Entities.Cart> GetOrCreateCartAsync(Guid userId, CancellationToken ct)
    {
        var cart = await _db.Carts
            .FirstOrDefaultAsync(c => c.UserId == userId, ct);

        if (cart is not null) return cart;

        cart = new Domain.Entities.Cart
        {
            Id = Guid.NewGuid(),
            UserId = userId,
        };
        _db.Carts.Add(cart);
        await _db.SaveChangesAsync(ct);
        return cart;
    }

    /// <summary>
    /// Project the cart with all items + variant + product + first image into
    /// the wire-shape DTO. Active variants only — disabled lines surface as
    /// <c>IsAvailable=false</c> so the SPA can flag them and let the user
    /// remove them before checkout.
    /// </summary>
    public async Task<CartDto> ToDtoAsync(Guid cartId, CancellationToken ct)
    {
        // Pull rows joined to product + variant + first image; project to the
        // DTO shape afterward (in-memory) so we can compute LineTotal once.
        var lines = await _db.CartItems
            .AsNoTracking()
            .Where(i => i.CartId == cartId)
            .Select(i => new
            {
                i.Id,
                i.Quantity,
                i.UnitPriceSnapshot,
                i.UpdatedAt,
                Variant = i.ProductVariant!,
                Product = i.ProductVariant!.Product!,
                PrimaryImageUrl = i.ProductVariant!.Product!.Images
                    .OrderBy(im => im.DisplayOrder)
                    .Select(im => im.Url)
                    .FirstOrDefault(),
            })
            .ToListAsync(ct);

        var cart = await _db.Carts
            .AsNoTracking()
            .FirstAsync(c => c.Id == cartId, ct);

        var items = lines
            .OrderByDescending(l => l.UpdatedAt)
            .Select(l =>
            {
                var available = l.Variant.IsActive
                    && l.Variant.Stock > 0
                    && l.Product.IsPublished;
                return new CartItemDto(
                    Id: l.Id,
                    ProductId: l.Product.Id,
                    ProductSlug: l.Product.Slug,
                    NameAr: l.Product.NameAr,
                    NameEn: l.Product.NameEn,
                    ProductVariantId: l.Variant.Id,
                    Size: l.Variant.Size,
                    ColorName: l.Variant.ColorName,
                    ColorNameAr: l.Variant.ColorNameAr,
                    ColorHex: l.Variant.ColorHex,
                    Sku: l.Variant.Sku,
                    Quantity: l.Quantity,
                    UnitPrice: l.Product.Price,
                    UnitPriceSnapshot: l.UnitPriceSnapshot,
                    LineTotal: l.Product.Price * l.Quantity,
                    VariantStock: l.Variant.Stock,
                    PrimaryImageUrl: l.PrimaryImageUrl,
                    IsAvailable: available);
            })
            .ToList();

        var subTotal = items.Where(i => i.IsAvailable).Sum(i => i.LineTotal);
        var totalQty = items.Where(i => i.IsAvailable).Sum(i => i.Quantity);

        return new CartDto(cart.Id, items, subTotal, totalQty, cart.UpdatedAt);
    }

    /// <summary>
    /// Look up a variant + parent product, applying public-visibility rules
    /// (active variant, published product, active category).
    /// </summary>
    public async Task<ProductVariant?> FindVariantForBuyerAsync(Guid variantId, CancellationToken ct)
    {
        return await _db.ProductVariants
            .Include(v => v.Product)
                .ThenInclude(p => p!.Category)
            .FirstOrDefaultAsync(v =>
                v.Id == variantId
                && v.IsActive
                && v.Product!.IsPublished
                && v.Product.Category!.IsActive,
                ct);
    }
}
