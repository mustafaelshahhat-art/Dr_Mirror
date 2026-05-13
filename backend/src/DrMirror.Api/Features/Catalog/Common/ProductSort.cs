namespace DrMirror.Api.Features.Catalog.Common;

/// <summary>
/// Allowed values for <c>?sort=</c> on the public products list. Wire format
/// is the lowercase camel-case identifier (e.g. <c>"priceAsc"</c>) — keep
/// these stable, frontend code references them by string.
/// </summary>
public enum ProductSort
{
    Newest = 0,
    PriceAsc = 1,
    PriceDesc = 2,
    NameAsc = 3,
}
