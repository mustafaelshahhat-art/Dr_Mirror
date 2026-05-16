using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.ReviewPaymentProof;

/// <summary>
/// Admin approves a buyer's payment-proof upload. The proof flips to
/// <see cref="PaymentProofStatus.Approved"/> and the parent order moves
/// <see cref="OrderStatus.PendingPaymentReview"/> → <see cref="OrderStatus.Paid"/>.
/// </summary>
public static class ApprovePaymentProofEndpoint
{
    public static RouteGroupBuilder MapApprovePaymentProof(this RouteGroupBuilder group)
    {
        group.MapPost("/{orderNumber}/proof/{proofId:guid}/approve", HandleAsync)
            .WithName("Admin.Orders.ApprovePaymentProof")
            .WithSummary("Approve a buyer-uploaded payment proof and move the order to Paid.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<ApprovePaymentProofRequest>()
            .Produces<OrderDetailDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        Guid proofId,
        ApprovePaymentProofRequest request,
        ICurrentUser current,
        AppDbContext db,
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
                detail: "This proof has been superseded by a more recent upload. Approve the latest pending proof.",
                statusCode: StatusCodes.Status409Conflict);
        }

        if (!fsm.CanTransition(order.Status, OrderStatus.Paid, OrderActor.Admin))
        {
            return Results.Problem(
                title: "Order cannot move to Paid",
                detail: $"Orders in status {order.Status} cannot be approved.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var now = DateTimeOffset.UtcNow;
        proof.Status = PaymentProofStatus.Approved;
        proof.ReviewedByUserId = adminId;
        proof.ReviewedAt = now;
        proof.ReviewNote = request.ReviewNote;

        fsm.Transition(order, OrderStatus.Paid, OrderActor.Admin);

        db.EmailOutboxMessages.Add(EmailOutboxHelper.ForStatusChanged(order.Id, order.Status));
        await db.SaveChangesAsync(ct);

        return Results.Ok(order.ToDetail(fsm));
    }
}
