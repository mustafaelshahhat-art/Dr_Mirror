using Coravel.Queuing.Interfaces;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Features.Inquiries.Common;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.RateLimiting;
using DrMirror.Api.Shared.Validation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Inquiries.Submit;

/// <summary>
/// Public endpoint — any visitor (authenticated or anonymous) can submit a
/// pre-sale inquiry. Sends an admin-notification email via the background queue.
/// </summary>
public static class SubmitInquiryEndpoint
{
    public static RouteGroupBuilder MapSubmitInquiry(this RouteGroupBuilder group)
    {
        group.MapPost("/", HandleAsync)
            .WithName("Inquiries.Submit")
            .WithSummary("Submit a product or general inquiry.")
            .RequireRateLimiting(RateLimitPolicies.InquirySubmit)
            .WithValidation<SubmitInquiryRequest>()
            .Produces<InquiryDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound)
            .AllowAnonymous();

        return group;
    }

    private static async Task<IResult> HandleAsync(
        SubmitInquiryRequest request,
        AppDbContext db,
        IQueue queue,
        CancellationToken ct)
    {
        // If a productId is provided, verify the product exists and is published.
        if (request.ProductId.HasValue)
        {
            var exists = await db.Products
                .AnyAsync(p => p.Id == request.ProductId.Value && p.IsPublished, ct);

            if (!exists)
            {
                return Results.Problem(
                    title: "Product not found",
                    detail: "The referenced product does not exist or is not available.",
                    statusCode: StatusCodes.Status404NotFound);
            }
        }

        var inquiry = new Inquiry
        {
            Id = Guid.NewGuid(),
            ProductId = request.ProductId,
            FullName = request.FullName.Trim(),
            Email = request.Email.Trim().ToLowerInvariant(),
            Phone = request.Phone?.Trim(),
            Subject = request.Subject.Trim(),
            Message = request.Message.Trim(),
            CreatedAt = DateTimeOffset.UtcNow,
        };

        db.Inquiries.Add(inquiry);
        await db.SaveChangesAsync(ct);

        queue.QueueInvocableWithPayload<SendInquiryReceivedJob, Guid>(inquiry.Id);

        return Results.Created($"/api/inquiries/{inquiry.Id}", inquiry.ToDto());
    }
}
