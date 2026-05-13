using DrMirror.Api.Features.Catalog.Common;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Catalog.GetProductBySlug;

public static class GetProductBySlugEndpoint
{
    public static RouteGroupBuilder MapGetProductBySlug(this RouteGroupBuilder group)
    {
        group.MapGet("/products/{slug}", HandleAsync)
            .WithName("Catalog.GetProductBySlug")
            .WithSummary("Public product detail. 404 if not found, hidden, or in an inactive category.")
            .Produces<ProductDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .AllowAnonymous();

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string slug,
        AppDbContext db,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return Results.Problem(
                title: "Invalid slug",
                statusCode: StatusCodes.Status404NotFound);
        }

        var product = await db.Products
            .AsNoTracking()
            .Where(p => p.Slug == slug && p.IsPublished && p.Category!.IsActive)
            .Include(p => p.Category)
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(ct);

        if (product is null)
        {
            return Results.Problem(
                title: "Product not found",
                statusCode: StatusCodes.Status404NotFound);
        }

        return Results.Ok(product.ToDetailDto());
    }
}
