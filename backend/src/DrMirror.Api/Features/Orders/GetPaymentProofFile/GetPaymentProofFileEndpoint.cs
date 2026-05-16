using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Orders.GetPaymentProofFile;

/// <summary>
/// Streams a payment-proof file to an authenticated caller. Buyers can only
/// access proofs from their own orders; admins can access any.
/// </summary>
public static class GetPaymentProofFileEndpoint
{
    public static RouteGroupBuilder MapGetPaymentProofFile(this RouteGroupBuilder group)
    {
        group.MapGet("/{orderNumber}/proof/{proofId:guid}/file", HandleAsync)
            .WithName("Orders.GetPaymentProofFile")
            .WithSummary("Stream a payment-proof file. Buyers: own orders only. Admins: any order.")
            .RequireAuthorization()
            .Produces(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        Guid proofId,
        ICurrentUser current,
        AppDbContext db,
        IFileStorageService storage,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        var isAdmin = current.Roles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase);

        var order = await db.Orders
            .Include(o => o.PaymentProofs)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber, ct);

        if (order is null)
        {
            return Results.Problem(title: "Order not found", statusCode: StatusCodes.Status404NotFound);
        }

        if (!isAdmin && order.BuyerUserId != userId)
        {
            return Results.Problem(title: "Access denied", statusCode: StatusCodes.Status403Forbidden);
        }

        var proof = order.PaymentProofs.FirstOrDefault(p => p.Id == proofId);
        if (proof is null)
        {
            return Results.Problem(title: "Proof not found", statusCode: StatusCodes.Status404NotFound);
        }

        var stream = await storage.OpenReadAsync(proof.FileKey, ct);
        return Results.Stream(stream, proof.ContentType);
    }
}
