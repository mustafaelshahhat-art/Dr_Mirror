namespace DrMirror.Api.Domain.Catalog;

/// <summary>
/// Target audience for an apparel SKU. Stored as <see cref="int"/> in MSSQL —
/// never reorder existing values; append-only.
///
/// Kids/Boys/Girls are deliberately deferred until we ship a kids' line; for
/// now everything is one of these three.
/// </summary>
public enum ProductGender
{
    Men = 0,
    Women = 1,
    Unisex = 2,
}
