using DrMirror.Api.Features.Catalog.Common;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Catalog.GetCategories;

public static class GetCategoriesEndpoint
{
    public static RouteGroupBuilder MapGetCategories(this RouteGroupBuilder group)
    {
        group.MapGet("/categories", HandleAsync)
            .WithName("Catalog.GetCategories")
            .WithSummary("Public list of active categories, ordered for nav rendering.")
            .Produces<IReadOnlyList<CategoryDto>>(StatusCodes.Status200OK)
            .AllowAnonymous();

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext db,
        CancellationToken ct)
    {
        var categories = await db.Categories
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.NameEn)
            .Select(c => new CategoryDto(c.Id, c.NameAr, c.NameEn, c.Slug, c.DisplayOrder))
            .ToListAsync(ct);

        return Results.Ok(categories);
    }
}
