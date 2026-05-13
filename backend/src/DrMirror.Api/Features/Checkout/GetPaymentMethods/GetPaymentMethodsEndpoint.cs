using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Checkout.GetPaymentMethods;

public static class GetPaymentMethodsEndpoint
{
    public static RouteGroupBuilder MapGetPaymentMethods(this RouteGroupBuilder group)
    {
        group.MapGet("/payment-methods", HandleAsync)
            .WithName("Checkout.GetPaymentMethods")
            .WithSummary("Active payment methods the buyer may pick at checkout, ordered for display.")
            .RequireAuthorization()
            .Produces<IReadOnlyList<PaymentMethodDto>>(StatusCodes.Status200OK);

        return group;
    }

    private static async Task<IResult> HandleAsync(AppDbContext db, CancellationToken ct)
    {
        var methods = await db.PaymentMethods
            .AsNoTracking()
            .Where(m => m.IsActive)
            .OrderBy(m => m.DisplayOrder)
            .ThenBy(m => m.NameEn)
            .ToListAsync(ct);

        return Results.Ok(methods.Select(m => m.ToDto()).ToList());
    }
}
