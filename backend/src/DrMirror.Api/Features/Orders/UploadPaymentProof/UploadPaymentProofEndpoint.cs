using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared.Localization;
using DrMirror.Api.Shared;
using DrMirror.Api.Shared.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Features.Orders.UploadPaymentProof;

/// <summary>
/// Buyer uploads a payment-proof screenshot for an Instapay / Wallet order.
/// Validates MIME + size, stores via <see cref="IFileStorageService"/>, then
/// moves the order to <see cref="OrderStatus.PendingPaymentReview"/> via the
/// FSM (System actor) and notifies the buyer + admin queue.
/// </summary>
public static class UploadPaymentProofEndpoint
{
    private static readonly Dictionary<string, byte[]> MagicBytes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            { "image/jpeg",       new byte[] { 0xFF, 0xD8, 0xFF } },
            { "image/png",        new byte[] { 0x89, 0x50, 0x4E, 0x47 } },
            { "application/pdf",  new byte[] { 0x25, 0x50, 0x44, 0x46 } },
        };

    private static bool HasValidMagicBytes(ReadOnlySpan<byte> header, string contentType)
    {
        if (!MagicBytes.TryGetValue(contentType, out var magic)) return false;
        return header.Length >= magic.Length && header[..magic.Length].SequenceEqual(magic);
    }

    public static RouteGroupBuilder MapUploadPaymentProof(this RouteGroupBuilder group)
    {
        group.MapPost("/{orderNumber}/proof", HandleAsync)
            .WithName("Orders.UploadPaymentProof")
            .WithSummary("Upload a payment-proof image for an Instapay / Wallet order.")
            .RequireAuthorization()
            .RequireRateLimiting(RateLimitPolicies.ProofUpload)
            .DisableAntiforgery() // bearer-token API, multipart upload
            .Produces<OrderDetailDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict)
            .ProducesProblem(StatusCodes.Status415UnsupportedMediaType);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        string orderNumber,
        IFormFile file,
        ICurrentUser current,
        AppDbContext db,
        [FromServices] OrderStateMachine fsm,
        [FromServices] IFileStorageService storage,
        [FromServices] IOptions<FileStorageOptions> opts,
        CancellationToken ct)
    {
        if (!current.IsAuthenticated || current.UserId is not { } userId)
        {
            return Results.Unauthorized();
        }

        if (file is null || file.Length == 0)
        {
            return Results.Problem(
                title: "No file provided",
                detail: "Attach the proof image as the `file` multipart field.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var o = opts.Value;
        if (file.Length > o.MaxFileSizeBytes)
        {
            return Results.Problem(
                title: "File too large",
                detail: $"Maximum allowed size is {o.MaxFileSizeBytes / 1024 / 1024} MB.",
                statusCode: StatusCodes.Status413PayloadTooLarge);
        }

        if (!o.PaymentProofContentTypes.Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
        {
            return Results.Problem(
                title: "Unsupported file type",
                detail: $"Upload a JPEG, PNG, or PDF file (received {file.ContentType}).",
                statusCode: StatusCodes.Status415UnsupportedMediaType);
        }

        // Read a small header for magic-byte validation, then stream the rest
        // directly to storage without buffering the entire file in memory.
        using var fileStream = file.OpenReadStream();
        var maxMagicLen = MagicBytes.Values.Max(m => m.Length);
        var header = new byte[maxMagicLen];
        var headerRead = await fileStream.ReadAsync(header, ct);

        // Validate file signature to prevent content-type spoofing.
        if (!HasValidMagicBytes(header[..headerRead], file.ContentType))
        {
            return Results.Problem(
                title: "File content does not match declared type",
                detail: "The uploaded file's content does not match its declared content-type.",
                statusCode: StatusCodes.Status415UnsupportedMediaType);
        }

        using var combined = new PrefixedStream(header[..headerRead].ToArray(), fileStream);

        // Load the order with the bits needed for FSM + the detail projection.
        var order = await db.Orders
            .Include(ord => ord.BuyerUser)
            .Include(ord => ord.PaymentMethod)
            .Include(ord => ord.Items).ThenInclude(i => i.Product)
            .Include(ord => ord.PaymentProofs).ThenInclude(p => p.ReviewedByUser)
            .FirstOrDefaultAsync(ord =>
                ord.OrderNumber == orderNumber && ord.BuyerUserId == userId, ct);

        if (order is null)
        {
            return Results.Problem(title: "Order not found", statusCode: StatusCodes.Status404NotFound);
        }

        // COD orders never need a proof.
        if (PaymentMethodClassification.Classify(order.PaymentMethodKind) == PaymentMethodGroup.Cod)
        {
            return Results.Problem(
                title: "Proof not required",
                detail: "Cash-on-delivery orders are paid to the courier on delivery; no proof needed.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        // The order must be in a state that accepts a (new) proof:
        //   - Pending           — first upload
        //   - PendingPaymentReview — re-upload while previous one is in queue (admin will see latest)
        // (Refused proofs bounce the order back to Pending in the admin reject endpoint.)
        if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.PendingPaymentReview)
        {
            return Results.Problem(
                title: "Order can no longer accept a payment proof",
                detail: $"Orders in status {order.Status} do not accept proof uploads.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // Stale-proof guard: if the order is already under review with a pending
        // proof, block another upload until the admin acts on the current one.
        if (order.Status == OrderStatus.PendingPaymentReview &&
            order.PaymentProofs.Any(p => p.Status == PaymentProofStatus.Pending))
        {
            return Results.Problem(
                title: "A payment proof is already pending review",
                detail: "Please wait for the admin to review it before uploading again.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // Upload to storage. Folder is keyed by order number for tidy listings.
        var stored = await storage.UploadAsync(
            combined,
            folder: $"payment-proofs/{order.OrderNumber}",
            originalFileName: file.FileName,
            contentType: file.ContentType,
            ct);

        var proof = new PaymentProof
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            FileUrl = stored.Url,
            FileKey = stored.Key,
            ContentType = stored.ContentType,
            SizeBytes = stored.SizeBytes,
            Status = PaymentProofStatus.Pending,
            UploadedAt = DateTimeOffset.UtcNow,
        };
        db.PaymentProofs.Add(proof);

        // Bump the order forward if it was sitting at Pending. A re-upload while
        // we're already in PendingPaymentReview leaves the status alone.
        if (order.Status == OrderStatus.Pending)
        {
            fsm.Transition(order, OrderStatus.PendingPaymentReview, OrderActor.System);
        }
        else
        {
            order.UpdatedAt = DateTimeOffset.UtcNow;
        }

        db.EmailOutboxMessages.Add(EmailOutboxHelper.ForPaymentReviewNeeded(order.Id));
        var language = NotificationLanguage.Normalize(order.BuyerUser?.Language);
        db.WhatsAppOutboxMessages.Add(WhatsAppOutboxHelper.CreateForOrder(
            order, "PaymentProofReceived", $"received-{proof.Id:N}"[..16], language));

        try
        {
            await WhatsAppOutboxHelper.SaveChangesIgnoringDuplicateAsync(db, ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Results.Problem(
                title: "Order state conflict",
                detail: "The order was modified by another request. Please refresh and try again.",
                statusCode: StatusCodes.Status409Conflict);
        }

        // Refresh PaymentProofs nav so the response includes the just-saved row.
        await db.Entry(order).Collection(ord => ord.PaymentProofs)
            .Query()
            .Include(p => p.ReviewedByUser)
            .LoadAsync(ct);

        return Results.Ok(order.ToDetail(fsm));
    }
}
