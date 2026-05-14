using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Catalog.Products;

public sealed record AdminVariantUpsertRequest(
    string Size,
    string ColorName,
    string ColorNameAr,
    string ColorHex,
    string Sku,
    int Stock);

public sealed class AdminVariantUpsertValidator : AbstractValidator<AdminVariantUpsertRequest>
{
    public AdminVariantUpsertValidator()
    {
        RuleFor(r => r.Size).NotEmpty().MaximumLength(16);
        RuleFor(r => r.ColorName).NotEmpty().MaximumLength(60);
        RuleFor(r => r.ColorNameAr).NotEmpty().MaximumLength(60);
        RuleFor(r => r.ColorHex)
            .NotEmpty()
            .Matches("^#[0-9A-Fa-f]{6}$")
            .WithMessage("Color hex must be a 7-char #RRGGBB code.");
        RuleFor(r => r.Sku).NotEmpty().MaximumLength(64);
        RuleFor(r => r.Stock).InclusiveBetween(0, 1_000_000);
    }
}

/// <summary>
/// Nested CRUD for Size × Color permutations on a product. Soft-delete only —
/// historical orders may still reference the variant id.
/// </summary>
public static class AdminVariantsEndpoints
{
    public static RouteGroupBuilder MapAdminVariants(this RouteGroupBuilder group)
    {
        group.MapPost("/{productId:guid}/variants", Create)
            .WithName("Admin.Variants.Create")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminVariantUpsertRequest>()
            .Produces<AdminProductVariantDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{productId:guid}/variants/{variantId:guid}", Update)
            .WithName("Admin.Variants.Update")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminVariantUpsertRequest>()
            .Produces<AdminProductVariantDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPost("/{productId:guid}/variants/{variantId:guid}/deactivate", Deactivate)
            .WithName("Admin.Variants.Deactivate")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminProductVariantDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{productId:guid}/variants/{variantId:guid}/activate", Activate)
            .WithName("Admin.Variants.Activate")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminProductVariantDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> Create(
        Guid productId,
        AdminVariantUpsertRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var product = await db.Products.FindAsync(new object[] { productId }, ct);
        if (product is null)
        {
            return Results.Problem(title: "Product not found", statusCode: StatusCodes.Status404NotFound);
        }

        // Uniqueness: same (ProductId, Size, ColorName) — mirrors the DB index.
        var dupCombo = await db.ProductVariants.AnyAsync(v =>
            v.ProductId == productId &&
            v.Size == request.Size &&
            v.ColorName == request.ColorName, ct);
        if (dupCombo)
        {
            return Results.Problem(
                title: "Variant already exists",
                detail: $"This product already has a {request.Size} / {request.ColorName} variant.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // Uniqueness: SKU globally.
        var dupSku = await db.ProductVariants.AnyAsync(v => v.Sku == request.Sku, ct);
        if (dupSku)
        {
            return Results.Problem(
                title: "SKU already in use",
                detail: $"Another variant already uses SKU \"{request.Sku}\".",
                statusCode: StatusCodes.Status409Conflict);
        }

        var entity = new ProductVariant
        {
            Id = Guid.NewGuid(),
            ProductId = productId,
            Size = request.Size.Trim(),
            ColorName = request.ColorName.Trim(),
            ColorNameAr = request.ColorNameAr.Trim(),
            ColorHex = request.ColorHex,
            Sku = request.Sku.Trim(),
            Stock = request.Stock,
            IsActive = true,
        };

        db.ProductVariants.Add(entity);
        await db.SaveChangesAsync(ct);

        return Results.Created(
            $"/api/admin/products/{productId}/variants/{entity.Id}",
            ToDto(entity));
    }

    private static async Task<IResult> Update(
        Guid productId,
        Guid variantId,
        AdminVariantUpsertRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var entity = await db.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Variant not found", statusCode: StatusCodes.Status404NotFound);
        }

        // Re-check uniqueness only if the values changed.
        var comboChanged = entity.Size != request.Size || entity.ColorName != request.ColorName;
        if (comboChanged)
        {
            var dupCombo = await db.ProductVariants.AnyAsync(v =>
                v.Id != variantId &&
                v.ProductId == productId &&
                v.Size == request.Size &&
                v.ColorName == request.ColorName, ct);
            if (dupCombo)
            {
                return Results.Problem(
                    title: "Variant already exists",
                    detail: $"This product already has a {request.Size} / {request.ColorName} variant.",
                    statusCode: StatusCodes.Status409Conflict);
            }
        }

        if (entity.Sku != request.Sku)
        {
            var dupSku = await db.ProductVariants.AnyAsync(v =>
                v.Id != variantId && v.Sku == request.Sku, ct);
            if (dupSku)
            {
                return Results.Problem(
                    title: "SKU already in use",
                    statusCode: StatusCodes.Status409Conflict);
            }
        }

        entity.Size = request.Size.Trim();
        entity.ColorName = request.ColorName.Trim();
        entity.ColorNameAr = request.ColorNameAr.Trim();
        entity.ColorHex = request.ColorHex;
        entity.Sku = request.Sku.Trim();
        entity.Stock = request.Stock;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return Results.Ok(ToDto(entity));
    }

    private static async Task<IResult> Deactivate(
        Guid productId,
        Guid variantId,
        AppDbContext db,
        CancellationToken ct)
    {
        var entity = await db.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Variant not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.IsActive = false;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(ToDto(entity));
    }

    private static async Task<IResult> Activate(
        Guid productId,
        Guid variantId,
        AppDbContext db,
        CancellationToken ct)
    {
        var entity = await db.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Variant not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.IsActive = true;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        return Results.Ok(ToDto(entity));
    }

    private static AdminProductVariantDto ToDto(ProductVariant v) => new(
        v.Id, v.Size, v.ColorName, v.ColorNameAr, v.ColorHex,
        v.Sku, v.Stock, v.IsActive, v.CreatedAt, v.UpdatedAt);
}
