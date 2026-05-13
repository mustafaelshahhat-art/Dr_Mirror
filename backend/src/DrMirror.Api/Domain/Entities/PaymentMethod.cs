using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// A buyer-selectable payment method. Seeded at startup; admin UI for editing
/// receiving account numbers / toggling on/off ships in M4.
/// </summary>
public class PaymentMethod
{
    public Guid Id { get; set; }

    /// <summary>Stable machine identifier (e.g. <c>cod</c>, <c>instapay</c>, <c>vodafone-cash</c>).</summary>
    public string Code { get; set; } = string.Empty;

    public PaymentMethodKind Kind { get; set; }

    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;

    /// <summary>
    /// Optional buyer-facing instructions in Arabic (e.g. "حوّل المبلغ إلى الرقم
    /// التالي ثم ارفع لقطة شاشة"). Free text, max 500 chars.
    /// </summary>
    public string? InstructionsAr { get; set; }
    public string? InstructionsEn { get; set; }

    /// <summary>
    /// Receiving account number to display to the buyer for Instapay/Wallet/BankTransfer.
    /// Null for COD. Free string so we can store IBANs, phone numbers, Instapay handles, etc.
    /// </summary>
    public string? AccountNumber { get; set; }

    /// <summary>Buyer-facing name for the receiving account (e.g. "Dr Mirror Sales").</summary>
    public string? AccountHolder { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>Display order in the buyer's checkout payment picker (lower first).</summary>
    public int DisplayOrder { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
