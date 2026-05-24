using FluentValidation;

namespace DrMirror.Api.Features.Admin.Catalog.Categories;

/// <summary>One taxonomy row as the admin sees it — including inactive rows.</summary>
public sealed record AdminCategoryDto(
    Guid Id,
    string NameAr,
    string NameEn,
    string Slug,
    int DisplayOrder,
    bool IsActive,
    int ProductCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>Create / update payload.</summary>
public sealed record AdminCategoryUpsertRequest(
    string NameAr,
    string NameEn);

public sealed class AdminCategoryUpsertValidator : AbstractValidator<AdminCategoryUpsertRequest>
{
    public AdminCategoryUpsertValidator()
    {
        RuleFor(r => r.NameAr).NotEmpty().MaximumLength(120);
        RuleFor(r => r.NameEn)
            .NotEmpty()
            .MaximumLength(120)
            // Slug derives from NameEn — require at least one ASCII alphanumeric so
            // SlugGenerator.Slugify() doesn't return an empty string.
            .Matches("[A-Za-z0-9]")
            .WithMessage("Category English name must contain at least one ASCII letter or digit.");
    }
}
