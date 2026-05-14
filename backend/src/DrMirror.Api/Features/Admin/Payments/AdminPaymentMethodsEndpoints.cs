using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Shared.Validation;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.Payments;

public sealed record AdminPaymentMethodDto(
    Guid Id,
    string Code,
    PaymentMethodKind Kind,
    string NameAr,
    string NameEn,
    string? InstructionsAr,
    string? InstructionsEn,
    string? AccountNumber,
    string? AccountHolder,
    bool IsActive,
    int DisplayOrder,
    int OrderCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record AdminPaymentMethodCreateRequest(
    string Code,
    PaymentMethodKind Kind,
    string NameAr,
    string NameEn,
    string? InstructionsAr,
    string? InstructionsEn,
    string? AccountNumber,
    string? AccountHolder,
    int DisplayOrder);

public sealed record AdminPaymentMethodUpdateRequest(
    string NameAr,
    string NameEn,
    string? InstructionsAr,
    string? InstructionsEn,
    string? AccountNumber,
    string? AccountHolder,
    int DisplayOrder);

public sealed class AdminPaymentMethodCreateValidator : AbstractValidator<AdminPaymentMethodCreateRequest>
{
    public AdminPaymentMethodCreateValidator()
    {
        RuleFor(r => r.Code)
            .NotEmpty()
            .MaximumLength(32)
            .Matches("^[a-z][a-z0-9_-]*$")
            .WithMessage("Code must be lowercase ASCII with hyphens or underscores, starting with a letter.");
        RuleFor(r => r.Kind).IsInEnum();
        RuleFor(r => r.NameAr).NotEmpty().MaximumLength(64);
        RuleFor(r => r.NameEn).NotEmpty().MaximumLength(64);
        RuleFor(r => r.InstructionsAr).MaximumLength(500);
        RuleFor(r => r.InstructionsEn).MaximumLength(500);
        RuleFor(r => r.AccountNumber).MaximumLength(64);
        RuleFor(r => r.AccountHolder).MaximumLength(100);
        RuleFor(r => r.DisplayOrder).InclusiveBetween(0, 999);
    }
}

public sealed class AdminPaymentMethodUpdateValidator : AbstractValidator<AdminPaymentMethodUpdateRequest>
{
    public AdminPaymentMethodUpdateValidator()
    {
        RuleFor(r => r.NameAr).NotEmpty().MaximumLength(64);
        RuleFor(r => r.NameEn).NotEmpty().MaximumLength(64);
        RuleFor(r => r.InstructionsAr).MaximumLength(500);
        RuleFor(r => r.InstructionsEn).MaximumLength(500);
        RuleFor(r => r.AccountNumber).MaximumLength(64);
        RuleFor(r => r.AccountHolder).MaximumLength(100);
        RuleFor(r => r.DisplayOrder).InclusiveBetween(0, 999);
    }
}

/// <summary>
/// CRUD on the catalog of buyer-selectable payment methods. <c>Kind</c> +
/// <c>Code</c> are immutable on update — they're snapshotted into order
/// history and changing them would rewrite the past.
/// </summary>
public static class AdminPaymentMethodsEndpoints
{
    public static RouteGroupBuilder MapAdminPaymentMethods(this RouteGroupBuilder group)
    {
        group.MapGet("/", List)
            .WithName("Admin.PaymentMethods.List")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<IReadOnlyList<AdminPaymentMethodDto>>(StatusCodes.Status200OK);

        group.MapPost("/", Create)
            .WithName("Admin.PaymentMethods.Create")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminPaymentMethodCreateRequest>()
            .Produces<AdminPaymentMethodDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status409Conflict);

        group.MapPut("/{id:guid}", Update)
            .WithName("Admin.PaymentMethods.Update")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .WithValidation<AdminPaymentMethodUpdateRequest>()
            .Produces<AdminPaymentMethodDto>(StatusCodes.Status200OK)
            .ProducesValidationProblem()
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/deactivate", Deactivate)
            .WithName("Admin.PaymentMethods.Deactivate")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminPaymentMethodDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/activate", Activate)
            .WithName("Admin.PaymentMethods.Activate")
            .RequireAuthorization(p => p.RequireRole(UserRoles.Admin))
            .Produces<AdminPaymentMethodDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        return group;
    }

    private static async Task<IResult> List(AppDbContext db, CancellationToken ct)
    {
        var rows = await db.PaymentMethods
            .AsNoTracking()
            .OrderBy(m => m.DisplayOrder)
            .ThenBy(m => m.NameEn)
            .Select(m => new AdminPaymentMethodDto(
                m.Id,
                m.Code,
                m.Kind,
                m.NameAr,
                m.NameEn,
                m.InstructionsAr,
                m.InstructionsEn,
                m.AccountNumber,
                m.AccountHolder,
                m.IsActive,
                m.DisplayOrder,
                db.Orders.Count(o => o.PaymentMethodId == m.Id),
                m.CreatedAt,
                m.UpdatedAt))
            .ToListAsync(ct);
        return Results.Ok(rows);
    }

    private static async Task<IResult> Create(
        AdminPaymentMethodCreateRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var code = request.Code.ToLowerInvariant();
        var dup = await db.PaymentMethods.AnyAsync(m => m.Code == code, ct);
        if (dup)
        {
            return Results.Problem(
                title: "Code already in use",
                detail: $"Another payment method already uses code \"{code}\".",
                statusCode: StatusCodes.Status409Conflict);
        }

        var entity = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            Code = code,
            Kind = request.Kind,
            NameAr = request.NameAr.Trim(),
            NameEn = request.NameEn.Trim(),
            InstructionsAr = string.IsNullOrWhiteSpace(request.InstructionsAr) ? null : request.InstructionsAr.Trim(),
            InstructionsEn = string.IsNullOrWhiteSpace(request.InstructionsEn) ? null : request.InstructionsEn.Trim(),
            AccountNumber = string.IsNullOrWhiteSpace(request.AccountNumber) ? null : request.AccountNumber.Trim(),
            AccountHolder = string.IsNullOrWhiteSpace(request.AccountHolder) ? null : request.AccountHolder.Trim(),
            DisplayOrder = request.DisplayOrder,
            IsActive = true,
        };

        db.PaymentMethods.Add(entity);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/admin/payment-methods/{entity.Id}", ToDto(entity, 0));
    }

    private static async Task<IResult> Update(
        Guid id,
        AdminPaymentMethodUpdateRequest request,
        AppDbContext db,
        CancellationToken ct)
    {
        var entity = await db.PaymentMethods.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Payment method not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.NameAr = request.NameAr.Trim();
        entity.NameEn = request.NameEn.Trim();
        entity.InstructionsAr = string.IsNullOrWhiteSpace(request.InstructionsAr) ? null : request.InstructionsAr.Trim();
        entity.InstructionsEn = string.IsNullOrWhiteSpace(request.InstructionsEn) ? null : request.InstructionsEn.Trim();
        entity.AccountNumber = string.IsNullOrWhiteSpace(request.AccountNumber) ? null : request.AccountNumber.Trim();
        entity.AccountHolder = string.IsNullOrWhiteSpace(request.AccountHolder) ? null : request.AccountHolder.Trim();
        entity.DisplayOrder = request.DisplayOrder;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);

        var orderCount = await db.Orders.CountAsync(o => o.PaymentMethodId == id, ct);
        return Results.Ok(ToDto(entity, orderCount));
    }

    private static async Task<IResult> Deactivate(Guid id, AppDbContext db, CancellationToken ct)
    {
        var entity = await db.PaymentMethods.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Payment method not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.IsActive = false;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var orderCount = await db.Orders.CountAsync(o => o.PaymentMethodId == id, ct);
        return Results.Ok(ToDto(entity, orderCount));
    }

    private static async Task<IResult> Activate(Guid id, AppDbContext db, CancellationToken ct)
    {
        var entity = await db.PaymentMethods.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (entity is null)
        {
            return Results.Problem(title: "Payment method not found", statusCode: StatusCodes.Status404NotFound);
        }

        entity.IsActive = true;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);

        var orderCount = await db.Orders.CountAsync(o => o.PaymentMethodId == id, ct);
        return Results.Ok(ToDto(entity, orderCount));
    }

    private static AdminPaymentMethodDto ToDto(PaymentMethod m, int orderCount) => new(
        m.Id, m.Code, m.Kind, m.NameAr, m.NameEn,
        m.InstructionsAr, m.InstructionsEn, m.AccountNumber, m.AccountHolder,
        m.IsActive, m.DisplayOrder, orderCount, m.CreatedAt, m.UpdatedAt);
}
