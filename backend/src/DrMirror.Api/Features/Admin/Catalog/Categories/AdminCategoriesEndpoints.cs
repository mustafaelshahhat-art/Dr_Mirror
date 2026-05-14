using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Slugs;
using DrMirror.Api.Shared.Validation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Catalog.Categories;

/// <summary>
/// CRUD for taxonomy categories. Soft-delete only — categories that still
/// have products attached cannot be deactivated until those products are
/// reassigned (or unpublished) elsewhere.
/// </summary>
public static class AdminCategoriesEndpoints
{
    public static RouteGroupBuilder MapAdminCategories(this RouteGroupBuilder group)
    {
        group.MapGet("/", List)
            .WithName("Admin.Categories.List")
            .WithSummary("Every category, including inactive ones. Sorted by DisplayOrder then NameEn.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<IReadOnlyList<AdminCategoryDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", Get)
            .WithName("Admin.Categories.Get")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminCategoryDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/", Create)
            .WithName("Admin.Categories.Create")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminCategoryUpsertRequest>()
            .Produces<AdminCategoryDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", Update)
            .WithName("Admin.Categories.Update")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminCategoryUpsertRequest>()
            .Produces<AdminCategoryDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/deactivate", Deactivate)
            .WithName("Admin.Categories.Deactivate")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminCategoryDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{id:guid}/activate", Activate)
            .WithName("Admin.Categories.Activate")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminCategoryDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> List(AppDbContext db, CancellationToken ct)
    {
        var rows = await db.Categories
            .AsNoTracking()
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.NameEn)
            .Select(c => new AdminCategoryDto(
                c.Id,
                c.NameAr,
                c.NameEn,
                c.Slug,
                c.DisplayOrder,
                c.IsActive,
                c.Products.Count,
                c.CreatedAt,
                c.UpdatedAt))
            .ToListAsync(ct);
        return Results.Ok(rows);
    }

    private static async Task<IResult> Get(Guid id, AppDbContext db, CancellationToken ct)
    {
        var c = await db.Categories
            .AsNoTracking()
            .Include(x => x.Products)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        return c is null
            ? Results.Problem(title: "Category not found", statusCode: StatusCodes.Status404NotFound)
            : Results.Ok(ToDto(c));
    }

    private static async Task<IResult> Create(
        AdminCategoryUpsertRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        // Generate a stable slug from the English name, then make it unique
        // against the current set. SlugGenerator is the only legal slug source.
        var existingSlugs = (await db.Categories.Select(c => c.Slug).ToListAsync(ct)).ToHashSet();
        var desired = SlugGenerator.Slugify(request.NameEn);
        if (string.IsNullOrEmpty(desired))
        {
            return Results.Problem(
                title: "Cannot generate slug",
                detail: "Category English name must contain at least one ASCII letter or digit.",
                statusCode: StatusCodes.Status409Conflict);
        }
        var slug = SlugGenerator.MakeUnique(desired, existingSlugs);

        var entity = new Category
        {
            Id = Guid.NewGuid(),
            NameAr = request.NameAr.Trim(),
            NameEn = request.NameEn.Trim(),
            Slug = slug,
            DisplayOrder = request.DisplayOrder,
            IsActive = true,
        };

        db.Categories.Add(entity);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/admin/categories/{entity.Id}", ToDto(entity, productCount: 0));
    }

    private static async Task<IResult> Update(
        Guid id,
        AdminCategoryUpsertRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var entity = await db.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Category not found", statusCode: StatusCodes.Status404NotFound);
        }

        // Slug stays stable on rename — locked at M2 close. The admin can
        // rename the display fields freely without invalidating URLs.
        entity.NameAr = request.NameAr.Trim();
        entity.NameEn = request.NameEn.Trim();
        entity.DisplayOrder = request.DisplayOrder;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return Results.Ok(ToDto(entity));
    }

    private static async Task<IResult> Deactivate(Guid id, AppDbContext db, CancellationToken ct)
    {
        var entity = await db.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Category not found", statusCode: StatusCodes.Status404NotFound);
        }

        // A category with published products would silently disappear from the
        // catalog if deactivated — that's a footgun. Refuse and ask the admin
        // to unpublish or move the products first.
        var blockingProducts = entity.Products.Count(p => p.IsPublished);
        if (blockingProducts > 0)
        {
            return Results.Problem(
                title: "Category has published products",
                detail: $"Unpublish or reassign the {blockingProducts} product(s) before deactivating this category.",
                statusCode: StatusCodes.Status409Conflict);
        }

        entity.IsActive = false;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(ToDto(entity));
    }

    private static async Task<IResult> Activate(Guid id, AppDbContext db, CancellationToken ct)
    {
        var entity = await db.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Category not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.IsActive = true;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(ToDto(entity));
    }

    private static AdminCategoryDto ToDto(Category c, int? productCount = null) => new(
        c.Id,
        c.NameAr,
        c.NameEn,
        c.Slug,
        c.DisplayOrder,
        c.IsActive,
        productCount ?? c.Products.Count,
        c.CreatedAt,
        c.UpdatedAt);
}
