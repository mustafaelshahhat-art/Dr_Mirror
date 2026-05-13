using DrMirror.Api.Features.Catalog.Common;
using DrMirror.Api.Infrastructure.Persistence;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Catalog.GetProducts;

public static class GetProductsEndpoint
{
    public static RouteGroupBuilder MapGetProducts(this RouteGroupBuilder group)
    {
        group.MapGet("/products", HandleAsync)
            .WithName("Catalog.GetProducts")
            .WithSummary("Public product listing with filtering, sorting, and pagination.")
            .Produces<PagedResult<ProductSummaryDto>>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .AllowAnonymous();

        return group;
    }

    private static async Task<IResult> HandleAsync(
        [AsParameters] GetProductsRequest filter,
        IValidator<GetProductsRequest> validator,
        AppDbContext db,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(filter, ct);
        if (!validation.IsValid)
        {
            return Results.ValidationProblem(
                validation.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray()));
        }

        // Base query: only published products in active categories.
        var query = db.Products
            .AsNoTracking()
            .Where(p => p.IsPublished && p.Category!.IsActive);

        if (filter.CategoryId is { } cid)
            query = query.Where(p => p.CategoryId == cid);

        if (!string.IsNullOrWhiteSpace(filter.Q))
        {
            var like = $"%{filter.Q.Trim()}%";
            query = query.Where(p =>
                EF.Functions.Like(p.NameAr, like) ||
                EF.Functions.Like(p.NameEn, like) ||
                (p.Brand != null && EF.Functions.Like(p.Brand, like)) ||
                (p.Sku != null && EF.Functions.Like(p.Sku, like)));
        }

        if (filter.Gender is { } gender)
            query = query.Where(p => p.Gender == gender);

        // Variant-level filters: a product matches if it has at least one
        // active in-stock variant satisfying the constraint.
        if (!string.IsNullOrWhiteSpace(filter.Size))
        {
            var size = filter.Size.Trim();
            query = query.Where(p =>
                p.Variants.Any(v => v.IsActive && v.Stock > 0 && v.Size == size));
        }

        if (!string.IsNullOrWhiteSpace(filter.Color))
        {
            var color = filter.Color.Trim();
            query = query.Where(p =>
                p.Variants.Any(v => v.IsActive && v.Stock > 0 &&
                    (v.ColorName == color || v.ColorNameAr == color)));
        }

        if (filter.MinPrice is { } min)
            query = query.Where(p => p.Price >= min);

        if (filter.MaxPrice is { } max)
            query = query.Where(p => p.Price <= max);

        var page = filter.EffectivePage;
        var pageSize = filter.EffectivePageSize;

        // Stable sort: secondary key on Id keeps page boundaries deterministic.
        query = filter.EffectiveSort switch
        {
            ProductSort.PriceAsc  => query.OrderBy(p => p.Price).ThenBy(p => p.Id),
            ProductSort.PriceDesc => query.OrderByDescending(p => p.Price).ThenBy(p => p.Id),
            ProductSort.NameAsc   => query.OrderBy(p => p.NameEn).ThenBy(p => p.Id),
            _                     => query.OrderByDescending(p => p.CreatedAt).ThenBy(p => p.Id),
        };

        var totalCount = await query.CountAsync(ct);

        // Project to the summary shape. AvailableSizes / AvailableColors / TotalStock
        // are aggregated server-side from the variant matrix so the SPA can paint
        // size labels and color swatches on the card without an extra round-trip.
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductSummaryDto(
                p.Id,
                p.NameAr,
                p.NameEn,
                p.Slug,
                p.Price,
                p.Gender,
                p.Brand,
                p.Images
                    .OrderBy(i => i.DisplayOrder)
                    .Select(i => i.Url)
                    .FirstOrDefault(),
                p.Variants
                    .Where(v => v.IsActive && v.Stock > 0)
                    .Select(v => v.Size)
                    .Distinct()
                    .ToList(),
                p.Variants
                    .Where(v => v.IsActive && v.Stock > 0)
                    .Select(v => new ColorOption(v.ColorName, v.ColorNameAr, v.ColorHex))
                    .Distinct()
                    .ToList(),
                p.Variants
                    .Where(v => v.IsActive)
                    .Sum(v => v.Stock),
                new CategoryDto(
                    p.Category!.Id,
                    p.Category.NameAr,
                    p.Category.NameEn,
                    p.Category.Slug,
                    p.Category.DisplayOrder)))
            .ToListAsync(ct);

        var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);

        return Results.Ok(new PagedResult<ProductSummaryDto>(
            items, page, pageSize, totalCount, totalPages));
    }
}
