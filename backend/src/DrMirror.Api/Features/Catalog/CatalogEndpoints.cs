using DrMirror.Api.Features.Catalog.GetCategories;
using DrMirror.Api.Features.Catalog.GetProductBySlug;
using DrMirror.Api.Features.Catalog.GetProducts;

namespace DrMirror.Api.Features.Catalog;

public static class CatalogEndpoints
{
    /// <summary>
    /// Mounts the public read-side catalog endpoints under <c>/api/catalog</c>.
    /// Everything is anonymous-readable; the admin write-side lands in M4
    /// under a separate auth-gated group (likely <c>/api/admin/catalog</c>).
    /// </summary>
    public static IEndpointRouteBuilder MapCatalogEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/catalog").WithTags("Catalog");

        group.MapGetCategories();
        group.MapGetProducts();
        group.MapGetProductBySlug();

        return app;
    }
}
