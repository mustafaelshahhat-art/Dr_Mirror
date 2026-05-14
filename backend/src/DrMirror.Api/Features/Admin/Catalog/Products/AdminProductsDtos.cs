using DrMirror.Api.Domain.Catalog;
using FluentValidation;

namespace DrMirror.Api.Features.Admin.Catalog.Products;

public sealed record AdminProductImageDto(
    Guid Id,
    string Url,
    string? Alt,
    int DisplayOrder,
    string? FileKey,
    string? ContentType,
    long? SizeBytes,
    DateTimeOffset CreatedAt);

public sealed record AdminProductVariantDto(
    Guid Id,
    string Size,
    string ColorName,
    string ColorNameAr,
    string ColorHex,
    string Sku,
    int Stock,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>Compact summary for the admin products list page.</summary>
public sealed record AdminProductSummaryDto(
    Guid Id,
    string NameAr,
    string NameEn,
    string Slug,
    decimal Price,
    ProductGender Gender,
    bool IsPublished,
    Guid CategoryId,
    string CategoryNameEn,
    string CategoryNameAr,
    int VariantCount,
    int TotalStock,
    int ImageCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>Full record for the admin edit page.</summary>
public sealed record AdminProductDetailDto(
    Guid Id,
    string NameAr,
    string NameEn,
    string Slug,
    string DescriptionAr,
    string DescriptionEn,
    decimal Price,
    ProductGender Gender,
    string? Material,
    string? Brand,
    string? Sku,
    bool IsPublished,
    Guid CategoryId,
    string CategoryNameEn,
    string CategoryNameAr,
    IReadOnlyList<AdminProductVariantDto> Variants,
    IReadOnlyList<AdminProductImageDto> Images,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record AdminProductCreateRequest(
    string NameAr,
    string NameEn,
    string DescriptionAr,
    string DescriptionEn,
    decimal Price,
    ProductGender Gender,
    string? Material,
    string? Brand,
    string? Sku,
    Guid CategoryId);

public sealed record AdminProductUpdateRequest(
    string NameAr,
    string NameEn,
    string DescriptionAr,
    string DescriptionEn,
    decimal Price,
    ProductGender Gender,
    string? Material,
    string? Brand,
    string? Sku,
    Guid CategoryId);

public sealed class AdminProductCreateValidator : AbstractValidator<AdminProductCreateRequest>
{
    public AdminProductCreateValidator() => SharedRules.Apply(this);
}

public sealed class AdminProductUpdateValidator : AbstractValidator<AdminProductUpdateRequest>
{
    public AdminProductUpdateValidator()
    {
        RuleFor(r => r.NameAr).NotEmpty().MaximumLength(200);
        RuleFor(r => r.NameEn).NotEmpty().MaximumLength(200);
        RuleFor(r => r.DescriptionAr).NotEmpty().MaximumLength(4000);
        RuleFor(r => r.DescriptionEn).NotEmpty().MaximumLength(4000);
        RuleFor(r => r.Price).InclusiveBetween(0m, 1_000_000m);
        RuleFor(r => r.Gender).IsInEnum();
        RuleFor(r => r.Material).MaximumLength(200);
        RuleFor(r => r.Brand).MaximumLength(80);
        RuleFor(r => r.Sku).MaximumLength(64);
        RuleFor(r => r.CategoryId).NotEmpty();
    }
}

internal static class SharedRules
{
    public static void Apply(AbstractValidator<AdminProductCreateRequest> v)
    {
        v.RuleFor(r => r.NameAr).NotEmpty().MaximumLength(200);
        v.RuleFor(r => r.NameEn)
            .NotEmpty()
            .MaximumLength(200)
            .Matches("[A-Za-z0-9]")
            .WithMessage("Product English name must contain at least one ASCII letter or digit.");
        v.RuleFor(r => r.DescriptionAr).NotEmpty().MaximumLength(4000);
        v.RuleFor(r => r.DescriptionEn).NotEmpty().MaximumLength(4000);
        v.RuleFor(r => r.Price).InclusiveBetween(0m, 1_000_000m);
        v.RuleFor(r => r.Gender).IsInEnum();
        v.RuleFor(r => r.Material).MaximumLength(200);
        v.RuleFor(r => r.Brand).MaximumLength(80);
        v.RuleFor(r => r.Sku).MaximumLength(64);
        v.RuleFor(r => r.CategoryId).NotEmpty();
    }
}
