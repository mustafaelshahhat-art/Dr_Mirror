using DrMirror.Api.Features.Admin.Orders.Returns.Common;
using DrMirror.Api.Features.Orders.Returns.Common;
using DrMirror.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Orders.Returns.GetAdminReturn;

public static class GetAdminReturnEndpoint
{
    public static RouteGroupBuilder MapGetAdminReturn(this RouteGroupBuilder group)
    {
        group.MapGet("/returns/{returnId:guid}", HandleAsync)
            .WithName("Admin.Returns.Get")
            .WithSummary("Get a single return request by ID.")
            .RequireAuthorization(policy => policy.RequireRole("Admin"))
            .Produces<AdminReturnRequestDto>()
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        Guid returnId,
        AppDbContext db,
        CancellationToken ct)
    {
        var returnRequest = await db.ReturnRequests
            .Include(r => r.Order)
            .Include(r => r.BuyerUser)
            .Include(r => r.ReviewedByAdmin)
            .Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == returnId, ct);

        if (returnRequest is null)
            return Results.Problem(title: "Return not found", statusCode: StatusCodes.Status404NotFound);

        return Results.Ok(returnRequest.ToAdminDto());
    }
}
