using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared;
using DrMirror.Api.Shared.Slugs;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Catalog.Products;

/// <summary>
/// CRUD on the master product record. Variants and images each have their
/// own nested slices (<c>AdminVariants</c>, <c>AdminProductImages</c>).
/// </summary>
public static class AdminProductsEndpoints
{
    public static RouteGroupBuilder MapAdminProducts(this RouteGroupBuilder group)
    {
        group.MapGet("/", List)
            .WithName("Admin.Products.List")
            .WithSummary("Every product, including unpublished drafts. Filter by category, gender, or text.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<PagedResult<AdminProductSummaryDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", Get)
            .WithName("Admin.Products.Get")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminProductDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithName("Admin.Products.Create")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminProductCreateRequest>()
            .Produces<AdminProductDetailDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", Update)
            .WithName("Admin.Products.Update")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminProductUpdateRequest>()
            .Produces<AdminProductDetailDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/publish", Publish)
            .WithName("Admin.Products.Publish")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminProductDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/unpublish", Unpublish)
            .WithName("Admin.Products.Unpublish")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminProductDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> List(
        AppDbContext db,
        [FromQuery] string? q,
        [FromQuery] Guid? categoryId,
        [FromQuery] ProductGender? gender,
        [FromQuery] bool? published,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .AsQueryable();

        if (categoryId.HasValue) query = query.Where(p => p.CategoryId == categoryId.Value);
        if (gender.HasValue) query = query.Where(p => p.Gender == gender.Value);
        if (published.HasValue) query = query.Where(p => p.IsPublished == published.Value);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var needle = $"%{q.Trim()}%";
            query = query.Where(p =>
                EF.Functions.Like(p.NameEn, needle) ||
                EF.Functions.Like(p.NameAr, needle) ||
                (p.Brand != null && EF.Functions.Like(p.Brand, needle)) ||
                (p.Sku != null && EF.Functions.Like(p.Sku, needle)));
        }

        var total = await query.CountAsync(ct);
        var rows = await query
            .OrderByDescending(p => p.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new AdminProductSummaryDto(
                p.Id,
                p.NameAr,
                p.NameEn,
                p.Slug,
                p.Price,
                p.Gender,
                p.IsPublished,
                p.CategoryId,
                p.Category!.NameEn,
                p.Category.NameAr,
                p.Variants.Count,
                p.Variants.Sum(v => v.IsActive ? v.Stock : 0),
                p.Images.Count,
                p.CreatedAt,
                p.UpdatedAt))
            .ToListAsync(ct);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return Results.Ok(new PagedResult<AdminProductSummaryDto>(rows, page, pageSize, total, totalPages));
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db, CancellationToken ct)
    {
        var p = await LoadDetail(db, id, ct);
        return p is null
            ? Results.Problem(title: "Product not found", statusCode: StatusCodes.Status404NotFound)
            : Results.Ok(ToDetail(p));
    }

    private static async Task<IResult> Create(
        AdminProductCreateRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var category = await db.Categories.FindAsync(new object[] { request.CategoryId }, ct);
        if (category is null)
        {
            return Results.Problem(title: "Category not found", statusCode: StatusCodes.Status404NotFound);
        }

        // Generate a stable slug from NameEn. Stays put on rename — locked at M2.
        var existingSlugs = (await db.Products.Select(x => x.Slug).ToListAsync(ct)).ToHashSet();
        var desired = SlugGenerator.Slugify(request.NameEn);
        if (string.IsNullOrEmpty(desired))
        {
            return Results.Problem(
                title: "Cannot generate slug",
                detail: "Product English name must contain at least one ASCII letter or digit.",
                statusCode: StatusCodes.Status409Conflict);
        }
        var slug = SlugGenerator.MakeUnique(desired, existingSlugs);

        var entity = new Product
        {
            Id = Guid.NewGuid(),
            NameAr = request.NameAr.Trim(),
            NameEn = request.NameEn.Trim(),
            Slug = slug,
            DescriptionAr = request.DescriptionAr.Trim(),
            DescriptionEn = request.DescriptionEn.Trim(),
            Price = request.Price,
            Gender = request.Gender,
            Material = string.IsNullOrWhiteSpace(request.Material) ? null : request.Material.Trim(),
            Brand = string.IsNullOrWhiteSpace(request.Brand) ? null : request.Brand.Trim(),
            Sku = string.IsNullOrWhiteSpace(request.Sku) ? null : request.Sku.Trim(),
            IsPublished = false, // drafts ship unpublished; admin flips when ready
            CategoryId = request.CategoryId,
        };

        db.Products.Add(entity);
        await db.SaveChangesAsync(ct);

        var reloaded = await LoadDetail(db, entity.Id, ct);
        return Results.Created($"/api/admin/products/{entity.Id}", ToDetail(reloaded!));
    }

    private static async Task<IResult> Update(
        Guid id,
        AdminProductUpdateRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var entity = await db.Products
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Product not found", statusCode: StatusCodes.Status404NotFound);
        }

        // Validate the target category exists if it changed.
        if (entity.CategoryId != request.CategoryId)
        {
            var exists = await db.Categories.AnyAsync(c => c.Id == request.CategoryId, ct);
            if (!exists)
            {
                return Results.Problem(title: "Category not found", statusCode: StatusCodes.Status404NotFound);
            }
            entity.CategoryId = request.CategoryId;
        }

        entity.NameAr = request.NameAr.Trim();
        entity.NameEn = request.NameEn.Trim();
        entity.DescriptionAr = request.DescriptionAr.Trim();
        entity.DescriptionEn = request.DescriptionEn.Trim();
        entity.Price = request.Price;
        entity.Gender = request.Gender;
        entity.Material = string.IsNullOrWhiteSpace(request.Material) ? null : request.Material.Trim();
        entity.Brand = string.IsNullOrWhiteSpace(request.Brand) ? null : request.Brand.Trim();
        entity.Sku = string.IsNullOrWhiteSpace(request.Sku) ? null : request.Sku.Trim();
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        // Slug stays stable on rename — locked at M2.

        await db.SaveChangesAsync(ct);

        var reloaded = await LoadDetail(db, entity.Id, ct);
        return Results.Ok(ToDetail(reloaded!));
    }

    private static async Task<IResult> Publish(Guid id, AppDbContext db, CancellationToken ct)
    {
        var entity = await db.Products
            .Include(p => p.Variants)
            .Include(p => p.Images)
            .Include(p => p.Category)
            .FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Product not found", statusCode: StatusCodes.Status404NotFound);
        }

        // A product without active in-stock variants would publish as "Sold out"
        // immediately, which is confusing. Block until at least one variant
        // exists and is active. Stock can still be zero (admin can flag
        // "preview" by publishing intentionally with all variants at 0).
        if (entity.Variants.Count(v => v.IsActive) == 0)
        {
            return Results.Problem(
                title: "No active variants",
                detail: "Add at least one active variant before publishing.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // Also block if the category itself is inactive — public listings already
        // skip such products, so publishing is misleading.
        if (entity.Category is { IsActive: false })
        {
            return Results.Problem(
                title: "Category is inactive",
                detail: "Reactivate the category or move the product to an active category first.",
                statusCode: StatusCodes.Status409Conflict);
        }

        entity.IsPublished = true;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var reloaded = await LoadDetail(db, entity.Id, ct);
        return Results.Ok(ToDetail(reloaded!));
    }

    private static async Task<IResult> Unpublish(Guid id, AppDbContext db, CancellationToken ct)
    {
        var entity = await db.Products.FirstOrDefaultAsync(p => p.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Product not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.IsPublished = false;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var reloaded = await LoadDetail(db, entity.Id, ct);
        return Results.Ok(ToDetail(reloaded!));
    }

    // -------- Helpers -----------------------------------------------------------

    private static Task<Product?> LoadDetail(AppDbContext db, Guid id, CancellationToken ct) =>
        db.Products
            .AsNoTracking()
            .Include(p => p.Category)
            .Include(p => p.Variants.OrderBy(v => v.Size).ThenBy(v => v.ColorName))
            .Include(p => p.Images.OrderBy(i => i.DisplayOrder))
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    private static AdminProductDetailDto ToDetail(Product p) => new(
        p.Id,
        p.NameAr,
        p.NameEn,
        p.Slug,
        p.DescriptionAr,
        p.DescriptionEn,
        p.Price,
        p.Gender,
        p.Material,
        p.Brand,
        p.Sku,
        p.IsPublished,
        p.CategoryId,
        p.Category?.NameEn ?? string.Empty,
        p.Category?.NameAr ?? string.Empty,
        p.Variants
            .Select(v => new AdminProductVariantDto(
                v.Id, v.Size, v.ColorName, v.ColorNameAr, v.ColorHex,
                v.Sku, v.Stock, v.IsActive, v.CreatedAt, v.UpdatedAt))
            .ToList(),
        p.Images
            .Select(i => new AdminProductImageDto(
                i.Id, i.Url, i.Alt, i.DisplayOrder,
                i.FileKey, i.ContentType, i.SizeBytes,
                i.CreatedAt))
            .ToList(),
        p.CreatedAt,
        p.UpdatedAt);
}
