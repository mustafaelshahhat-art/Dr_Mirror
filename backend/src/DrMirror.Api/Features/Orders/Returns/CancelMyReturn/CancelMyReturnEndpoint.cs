using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.Returns.CancelMyReturn;

public static class CancelMyReturnEndpoint
{
    public static RouteGroupBuilder MapCancelMyReturn(this RouteGroupBuilder group)
    {
        group.MapDelete("/{orderNumber}/returns/{returnId:guid}", HandleAsync)
            .WithName("Orders.Returns.CancelMine")
            .WithSummary("Cancel a buyer-owned return request while it is still Requested.")
            .RequireAuthorization()
            .Produces<ReturnRequestDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        Guid returnId,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var returnRequest = await db.ReturnRequests
            .Include(r => r.Order)
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == returnId && r.Order!.OrderNumber == orderNumber, ct);

        if (returnRequest is null)
        {
            return Results.Problem(title: "Return not found", statusCode: StatusCodes.Status404NotFound);
        }

        if (returnRequest.BuyerUserId != userId)
        {
            return Results.Forbid();
        }

        if (!ReturnStateMachine.CanBuyerCancel(returnRequest.Status))
        {
            return Results.Problem(
                title: "Return can no longer be cancelled",
                detail: "Only requested returns can be cancelled by the buyer.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var now = DateTimeOffset.UtcNow;
        returnRequest.Status = ReturnStatus.Cancelled;
        returnRequest.CancelledAt = now;
        returnRequest.UpdatedAt = now;

        await db.SaveChangesAsync(ct);

        return Results.Ok(returnRequest.ToDto());
    }
}
