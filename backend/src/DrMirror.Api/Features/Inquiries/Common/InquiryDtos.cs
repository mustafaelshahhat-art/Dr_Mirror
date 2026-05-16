using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using FluentValidation;
using FluentValidation.Validators;

namespace DrMirror.Api.Features.Inquiries.Common;

// ── Response DTOs ──────────────────────────────────────────────────────────

public sealed record InquiryDto(
    Guid Id,
    Guid? ProductId,
    string? ProductNameEn,
    string? ProductNameAr,
    string FullName,
    string Email,
    string? Phone,
    string Subject,
    string Message,
    InquiryStatus Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ReadAt,
    string? ReadByUserName,
    DateTimeOffset? RespondedAt,
    string? RespondedByUserName);

// ── Request DTOs ───────────────────────────────────────────────────────────

public sealed record SubmitInquiryRequest(
    Guid? ProductId,
    string FullName,
    string Email,
    string? Phone,
    string Subject,
    string Message);

// ── Mapping ────────────────────────────────────────────────────────────────

public static class InquiryMapping
{
    public static InquiryDto ToDto(this Inquiry i) => new(
        Id: i.Id,
        ProductId: i.ProductId,
        ProductNameEn: i.Product?.NameEn,
        ProductNameAr: i.Product?.NameAr,
        FullName: i.FullName,
        Email: i.Email,
        Phone: i.Phone,
        Subject: i.Subject,
        Message: i.Message,
        Status: i.Status,
        CreatedAt: i.CreatedAt,
        ReadAt: i.ReadAt,
        ReadByUserName: i.ReadByUser?.FullName,
        RespondedAt: i.RespondedAt,
        RespondedByUserName: i.RespondedByUser?.FullName);
}

// ── Validators ─────────────────────────────────────────────────────────────

public sealed class SubmitInquiryValidator : AbstractValidator<SubmitInquiryRequest>
{
    public SubmitInquiryValidator()
    {
        RuleFor(r => r.FullName).NotEmpty().MaximumLength(100);
        RuleFor(r => r.Email).NotEmpty()
            .EmailAddress(EmailValidationMode.AspNetCoreCompatible)
            .Must(e => e != null && e.LastIndexOf('.') > e.IndexOf('@'))
            .WithMessage("'{PropertyName}' must be a valid email address.")
            .MaximumLength(200);
        RuleFor(r => r.Phone).MaximumLength(30);
        RuleFor(r => r.Subject).NotEmpty().MaximumLength(200);
        RuleFor(r => r.Message).NotEmpty().MaximumLength(2000);
    }
}
