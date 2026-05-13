using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Features.Catalog.Common;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;

namespace DrMirror.Api.Features.Catalog.GetProducts;

/// <summary>
/// Query-string-bound filter for the public products listing. All fields are
/// optional; <see cref="GetProductsValidator"/> enforces ranges and consistency.
///
/// Apparel-domain filters: <c>gender</c>, <c>size</c>, and <c>color</c>
/// (matched against variant ColorName, case-insensitive).
/// </summary>
public sealed class GetProductsRequest
{
    // All optional. The Minimal-API request-delegate factory treats every
    // non-nullable [FromQuery] property as required, so we make them nullable
    // here and resolve defaults via the Effective* convenience accessors below.
    [FromQuery(Name = "categoryId")] public Guid? CategoryId { get; set; }
    [FromQuery(Name = "q")]          public string? Q { get; set; }
    [FromQuery(Name = "gender")]     public ProductGender? Gender { get; set; }
    [FromQuery(Name = "size")]       public string? Size { get; set; }
    [FromQuery(Name = "color")]      public string? Color { get; set; }
    [FromQuery(Name = "minPrice")]   public decimal? MinPrice { get; set; }
    [FromQuery(Name = "maxPrice")]   public decimal? MaxPrice { get; set; }
    [FromQuery(Name = "sort")]       public ProductSort? Sort { get; set; }
    [FromQuery(Name = "page")]       public int? Page { get; set; }
    [FromQuery(Name = "pageSize")]   public int? PageSize { get; set; }

    public const int DefaultPageSize = 24;

    public int EffectivePage => Page is { } p && p > 0 ? p : 1;
    public int EffectivePageSize => PageSize is { } s && s > 0 ? s : DefaultPageSize;
    public ProductSort EffectiveSort => Sort ?? ProductSort.Newest;
}

public sealed class GetProductsValidator : AbstractValidator<GetProductsRequest>
{
    public const int MaxPageSize = 60;
    public const int MaxQueryLength = 120;
    public const int MaxSizeLength = 16;
    public const int MaxColorLength = 60;

    public GetProductsValidator()
    {
        RuleFor(x => x.Page!.Value).GreaterThanOrEqualTo(1).When(x => x.Page.HasValue);
        RuleFor(x => x.PageSize!.Value).InclusiveBetween(1, MaxPageSize).When(x => x.PageSize.HasValue);
        RuleFor(x => x.Q).MaximumLength(MaxQueryLength);
        RuleFor(x => x.Size).MaximumLength(MaxSizeLength);
        RuleFor(x => x.Color).MaximumLength(MaxColorLength);
        RuleFor(x => x.MinPrice).GreaterThanOrEqualTo(0).When(x => x.MinPrice.HasValue);
        RuleFor(x => x.MaxPrice).GreaterThanOrEqualTo(0).When(x => x.MaxPrice.HasValue);

        RuleFor(x => x).Must(x => x.MinPrice <= x.MaxPrice)
            .When(x => x.MinPrice.HasValue && x.MaxPrice.HasValue)
            .WithMessage("'minPrice' must be less than or equal to 'maxPrice'.");

        RuleFor(x => x.Sort!.Value).IsInEnum().When(x => x.Sort.HasValue);
        RuleFor(x => x.Gender!.Value).IsInEnum().When(x => x.Gender.HasValue);
    }
}
