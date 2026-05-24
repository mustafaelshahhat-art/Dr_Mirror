using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Shipping;

public static class ShippingEndpoints
{
    public static IEndpointRouteBuilder MapShippingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/shipping").WithTags("Shipping");

        group.MapGet("/governorates", async (AppDbContext db, CancellationToken ct) =>
            await db.GovernorateShippingFees
                .AsNoTracking()
                .Where(g => g.IsActive)
                .OrderBy(g => g.NameEn)
                .Select(g => new GovernoratePublicDto(
                    g.Id,
                    g.Slug,
                    g.NameEn,
                    g.NameAr,
                    g.Fee,
                    "EGP"))
                .ToListAsync(ct))
            .WithName("Shipping.GetGovernorates")
            .WithSummary("List active governorates and their shipping fees.")
            .AllowAnonymous()
            .Produces<IReadOnlyList<GovernoratePublicDto>>();

        return app;
    }
}

public sealed record GovernoratePublicDto(
    Guid Id,
    string Slug,
    string NameEn,
    string NameAr,
    decimal Fee,
    string Currency);
