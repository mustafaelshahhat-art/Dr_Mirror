namespace DrMirror.Api.Domain.Orders;

/// <summary>
/// The kind of payment a <c>PaymentMethod</c> represents. Drives both UX
/// (proof upload required? account number shown?) and the order's initial
/// status at checkout (<see cref="Cod"/> → Confirmed, others → Pending until
/// proof reviewed).
/// </summary>
public enum PaymentMethodKind
{
    /// <summary>Cash on delivery. No upfront payment, no proof needed.</summary>
    Cod = 0,

    /// <summary>Instapay transfer to a published receiving account.</summary>
    Instapay = 1,

    /// <summary>Mobile wallet (Vodafone Cash / Etisalat Cash / Orange Money / We Pay).</summary>
    Wallet = 2,

    /// <summary>Direct bank transfer (reserved for future use).</summary>
    BankTransfer = 3,
}
