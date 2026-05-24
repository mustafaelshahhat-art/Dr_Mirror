using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Shipping;

public sealed record AdminGovernorateShippingFeeDto(
    Guid Id,
    string Slug,
    string NameEn,
    string NameAr,
    decimal Fee,
    bool IsActive,
    DateTimeOffset UpdatedAt);

public sealed record AdminGovernorateShippingFeeUpdateRequest(decimal Fee, bool IsActive);

public sealed class AdminGovernorateShippingFeeUpdateValidator
    : AbstractValidator<AdminGovernorateShippingFeeUpdateRequest>
{
    public AdminGovernorateShippingFeeUpdateValidator()
    {
        RuleFor(r => r.Fee).GreaterThanOrEqualTo(0).PrecisionScale(18, 2, true);
    }
}

public static class AdminShippingEndpoints
{
    public static RouteGroupBuilder MapAdminShipping(this RouteGroupBuilder group)
    {
        group.MapGet("/governorates", List)
            .WithName("Admin.Shipping.Governorates.List")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<IReadOnlyList<AdminGovernorateShippingFeeDto>>(StatusCodes.Status200OK);

        group.MapPut("/governorates/{id:guid}", Update)
            .WithName("Admin.Shipping.Governorates.Update")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminGovernorateShippingFeeUpdateRequest>()
            .Produces<AdminGovernorateShippingFeeDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> List(AppDbContext db, CancellationToken ct)
    {
        var rows = await db.GovernorateShippingFees
            .AsNoTracking()
            .OrderBy(g => g.NameEn)
            .Select(g => new AdminGovernorateShippingFeeDto(
                g.Id,
                g.Slug,
                g.NameEn,
                g.NameAr,
                g.Fee,
                g.IsActive,
                g.UpdatedAt))
            .ToListAsync(ct);

        return Results.Ok(rows);
    }

    private static async Task<IResult> Update(
        Guid id,
        AdminGovernorateShippingFeeUpdateRequest request,
        ICurrentUser current,
        AppDbContext db,
        CancellationToken ct)
    {
        if (current.UserId is not { } adminId) return Results.Unauthorized();

        var row = await db.GovernorateShippingFees.FirstOrDefaultAsync(g => g.Id == id, ct);
        if (row is null)
        {
            return Results.Problem(title: "Governorate shipping fee not found", statusCode: StatusCodes.Status404NotFound);
        }

        row.Fee = request.Fee;
        row.IsActive = request.IsActive;
        row.UpdatedAt = DateTimeOffset.UtcNow;
        row.LastUpdatedByAdminId = adminId;

        await db.SaveChangesAsync(ct);

        return Results.Ok(ToDto(row));
    }

    private static AdminGovernorateShippingFeeDto ToDto(GovernorateShippingFee row) => new(
        row.Id,
        row.Slug,
        row.NameEn,
        row.NameAr,
        row.Fee,
        row.IsActive,
        row.UpdatedAt);
}
