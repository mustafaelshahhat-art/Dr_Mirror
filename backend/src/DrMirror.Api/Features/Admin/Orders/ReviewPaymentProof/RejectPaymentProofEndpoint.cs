using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Auditing;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.ReviewPaymentProof;

/// <summary>
/// Admin rejects a payment proof — usually because the transfer cannot be
/// matched. The proof flips to <see cref="PaymentProofStatus.Rejected"/> with
/// a non-empty review note and the parent order bounces back from
/// <see cref="OrderStatus.PendingPaymentReview"/> to <see cref="OrderStatus.Pending"/>
/// so the buyer can upload a new screenshot.
/// </summary>
public static class RejectPaymentProofEndpoint
{
    public static RouteGroupBuilder MapRejectPaymentProof(this RouteGroupBuilder group)
    {
        group.MapPost("/{orderNumber}/proof/{proofId:guid}/reject", HandleAsync)
            .WithName("Admin.Orders.RejectPaymentProof")
            .WithSummary("Reject a buyer-uploaded payment proof with a reason; bounces the order back to Pending.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<RejectPaymentProofRequest>()
            .Produces<OrderDetailDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        Guid proofId,
        RejectPaymentProofRequest request,
        ICurrentUser current,
        AppDbContext db,
        IAdminAuditWriter audit,
        [FromServices] OrderStateMachine fsm,
        CancellationToken ct)
    {
        if (current.UserId is not { } adminId)
        {
            return Results.Unauthorized();
        }

        var order = await db.Orders
            .Include(o => o.BuyerUser)
            .Include(o => o.PaymentMethod)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.PaymentProofs).ThenInclude(p => p.ReviewedByUser)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, ct);

        if (order is null)
        {
            return Results.Problem(title: "Order not found", statusCode: StatusCodes.Status404NotFound);
        }

        var proof = order.PaymentProofs.FirstOrDefault(p => p.Id == proofId);
        if (proof is null)
        {
            return Results.Problem(title: "Proof not found", statusCode: StatusCodes.Status404NotFound);
        }

        if (proof.Status != PaymentProofStatus.Pending)
        {
            return Results.Problem(
                title: "Proof already reviewed",
                detail: $"This proof is already {proof.Status}.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var latestPendingId = order.PaymentProofs
            .Where(p => p.Status == PaymentProofStatus.Pending)
            .OrderByDescending(p => p.UploadedAt)
            .Select(p => p.Id)
            .FirstOrDefault();

        if (latestPendingId != proof.Id)
        {
            return Results.Problem(
                title: "Stale proof",
                detail: "This proof has been superseded by a more recent upload. Reject the latest pending proof.",
                statusCode: StatusCodes.Status409Conflict);
        }

        if (!fsm.CanTransition(order.Status, OrderStatus.Pending, OrderActor.Admin))
        {
            return Results.Problem(
                title: "Order cannot move back to Pending",
                detail: $"Orders in status {order.Status} cannot be rejected.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var now = DateTimeOffset.UtcNow;
        proof.Status = PaymentProofStatus.Rejected;
        proof.ReviewedByUserId = adminId;
        proof.ReviewedAt = now;
        proof.ReviewNote = request.ReviewNote;

        fsm.Transition(order, OrderStatus.Pending, OrderActor.Admin);

        await audit.WriteAsync(
            "PaymentProof.Reject",
            "Order",
            order.Id.ToString(),
            PaymentProofStatus.Pending.ToString(),
            proof.Status.ToString(),
            ct,
            request.ReviewNote);

        db.EmailOutboxMessages.Add(EmailOutboxHelper.ForStatusChanged(order.Id, order.Status));

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Problem(
                title: "Order state conflict",
                detail: "The order was modified by another request. Please refresh and try again.",
                statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Ok(order.ToDetail(fsm));
    }
}
