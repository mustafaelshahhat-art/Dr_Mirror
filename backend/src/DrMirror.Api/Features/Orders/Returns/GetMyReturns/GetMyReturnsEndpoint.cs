using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.Returns.GetMyReturns;

public static class GetMyReturnsEndpoint
{
    public static RouteGroupBuilder MapGetMyReturns(this RouteGroupBuilder group)
    {
        group.MapGet("/{orderNumber}/returns", HandleAsync)
            .WithName("Orders.Returns.GetMine")
            .WithSummary("List the authenticated buyer's return requests for one order.")
            .RequireAuthorization()
            .Produces<IReadOnlyList<ReturnRequestDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var returns = await db.ReturnRequests
            .AsNoTracking()
            .Include(r => r.Order)
            .Include(r => r.Items)
            .Where(r => r.Order!.OrderNumber == orderNumber && r.BuyerUserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

        return Results.Ok(returns.Select(r => r.ToDto()).ToList());
    }
}
