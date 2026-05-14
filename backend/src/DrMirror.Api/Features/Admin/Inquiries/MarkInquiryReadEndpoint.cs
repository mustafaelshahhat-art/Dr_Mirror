using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Inquiries.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Inquiries;

/// <summary>
/// Marks an inquiry as Read. Idempotent — calling it on an already-read
/// inquiry just returns the current state with 200.
/// </summary>
public static class MarkInquiryReadEndpoint
{
    public static RouteGroupBuilder MapMarkInquiryRead(this RouteGroupBuilder group)
    {
        group.MapPost("/{inquiryId:guid}/read", HandleAsync)
            .WithName("Admin.Inquiries.MarkRead")
            .WithSummary("Mark an inquiry as read.")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<InquiryDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

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
            .FirstOrDefaultAsync(i => i.Id == inquiryId, ct);

        if (inquiry is null)
            return Results.Problem(title: "Inquiry not found", statusCode: StatusCodes.Status404NotFound);

        if (inquiry.Status == InquiryStatus.New)
        {
            inquiry.Status = InquiryStatus.Read;
            inquiry.ReadByUserId = adminId;
            inquiry.ReadAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
        }

        return Results.Ok(inquiry.ToDto());
    }
}
