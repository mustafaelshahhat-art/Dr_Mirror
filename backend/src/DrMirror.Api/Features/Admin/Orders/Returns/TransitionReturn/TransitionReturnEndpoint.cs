using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Admin.Orders.Returns.Common;
using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Auditing;
using DrMirror.Api.Shared.Validation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.Returns.TransitionReturn;

public static class TransitionReturnEndpoint
{
    public static RouteGroupBuilder MapTransitionReturn(this RouteGroupBuilder group)
    {
        group.MapPost("/{orderNumber}/returns/{returnId:guid}/transitions", HandleAsync)
            .WithName("Admin.Orders.Returns.Transition")
            .WithSummary("Apply an admin transition to a return request.")
            .WithValidation<TransitionReturnRequest>()
            .Produces<AdminReturnRequestDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        Guid returnId,
        TransitionReturnRequest request,
        AppDbContext db,
        IAdminAuditWriter audit,
        CancellationToken ct)
    {
        var returnRequest = await db.ReturnRequests
            .Include(r => r.Order)
            .Include(r => r.BuyerUser)
            .Include(r => r.ReviewedByAdmin)
            .Include(r => r.Items)
            .ThenInclude(i => i.ProductVariant)
            .FirstOrDefaultAsync(r => r.Id == returnId && r.Order!.OrderNumber == orderNumber, ct);

        if (returnRequest is null)
        {
            return Results.Problem(title: "Return not found", statusCode: StatusCodes.Status404NotFound);
        }

        ReturnStatus nextStatus;
        try
        {
            nextStatus = ReturnStateMachine.ValidateAdminTransition(returnRequest.Status, request.Action);
        }
        catch (ReturnTransitionConflictException ex)
        {
            return Results.Problem(
                title: "Invalid return transition",
                detail: ex.Message,
                statusCode: StatusCodes.Status409Conflict);
        }

        IResult? result = null;
        var strategy = db.Database.CreateExecutionStrategy();
        await strategy.ExecuteAsync(async ctInner =>
        {
            await using var transaction = db.Database.IsRelational()
                ? await db.Database.BeginTransactionAsync(ctInner)
                : null;

            var previousStatus = returnRequest.Status;
            var now = DateTimeOffset.UtcNow;

            returnRequest.Status = nextStatus;
            returnRequest.AdminNote = string.IsNullOrWhiteSpace(request.AdminNote) ? returnRequest.AdminNote : request.AdminNote.Trim();
            returnRequest.UpdatedAt = now;

            if (nextStatus is ReturnStatus.Approved or ReturnStatus.Rejected)
            {
                returnRequest.ReviewedAt = now;
            }
            else if (nextStatus == ReturnStatus.Received)
            {
                returnRequest.ReceivedAt = now;
            }
            else if (nextStatus == ReturnStatus.Completed)
            {
                returnRequest.CompletedAt = now;
                foreach (var item in returnRequest.Items)
                {
                    if (item.ProductVariant is { } variant)
                    {
                        variant.Stock += item.Quantity;
                        variant.UpdatedAt = now;
                    }
                }
            }

            await audit.WriteAsync(
                "Return.StatusChange",
                "ReturnRequest",
                returnRequest.Id.ToString(),
                previousStatus.ToString(),
                nextStatus.ToString(),
                ctInner,
                request.AdminNote);

            if (nextStatus is ReturnStatus.Approved or ReturnStatus.Rejected or ReturnStatus.Completed)
            {
                db.EmailOutboxMessages.Add(EmailOutboxHelper.ForReturnStatusChanged(returnRequest.Id, nextStatus));
            }

            try
            {
                await db.SaveChangesAsync(ctInner);
                if (transaction is not null)
                {
                    await transaction.CommitAsync(ctInner);
                }
            }
            catch (DbUpdateConcurrencyException)
            {
                result = Results.Problem(
                    title: "Return state conflict",
                    detail: "The return was modified by another request. Please refresh and try again.",
                    statusCode: StatusCodes.Status409Conflict);
                return;
            }

            result = Results.Ok(returnRequest.ToAdminDto());
        }, ct);

        return result ?? Results.Problem(title: "Transition failed", statusCode: StatusCodes.Status500InternalServerError);
    }
}
