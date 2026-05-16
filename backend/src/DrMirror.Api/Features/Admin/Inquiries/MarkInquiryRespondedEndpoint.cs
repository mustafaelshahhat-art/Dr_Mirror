using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Inquiries.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Inquiries;

/// <summary>
/// Marks an inquiry as Responded. Can only be called on a Read inquiry
/// (not New — mark it read first). Returns 409 if already responded.
/// </summary>
public static class MarkInquiryRespondedEndpoint
{
    public static RouteGroupBuilder MapMarkInquiryResponded(this RouteGroupBuilder group)
    {
        group.MapPost("/{inquiryId:guid}/respond", HandleAsync)
            .WithName("Admin.Inquiries.MarkResponded")
            .WithSummary("Mark a read inquiry as responded.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<InquiryDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound)
            .ProducesProblem(StatusCodes.Status409Conflict);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        Guid inquiryId,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } adminId)
            return Results.Unauthorized();

        var inquiry = await db.Inquiries
            .Include(i => i.Product)
            .Include(i => i.ReadByUser)
            .Include(i => i.RespondedByUser)
            .FirstOrDefaultAsync(i => i.Id == inquiryId, ct);

        if (inquiry is null)
            return Results.Problem(title: "Inquiry not found", statusCode: StatusCodes.Status404NotFound);

        if (inquiry.Status == InquiryStatus.Responded)
            return Results.Problem(
                title: "Already responded",
                detail: "This inquiry has already been marked as responded.",
                statusCode: StatusCodes.Status409Conflict);

        inquiry.Status = InquiryStatus.Responded;
        inquiry.RespondedByUserId = adminId;
        inquiry.RespondedAt = DateTimeOffset.UtcNow;

        // Ensure ReadAt is stamped if it wasn't already (responding implies having read it).
        if (inquiry.ReadAt is null)
        {
            inquiry.ReadByUserId = adminId;
            inquiry.ReadAt = inquiry.RespondedAt;
        }

        await db.SaveChangesAsync(ct);

        // Reload nav properties so the DTO reflects the responded-by user's name.
        await db.Entry(inquiry).Reference(i => i.RespondedByUser).LoadAsync(ct);

        return Results.Ok(inquiry.ToDto());
    }
}
