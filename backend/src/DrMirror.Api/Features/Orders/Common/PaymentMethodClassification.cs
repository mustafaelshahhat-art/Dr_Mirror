using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Features.Orders.Common;

public enum PaymentMethodGroup
{
    Cod,
    ProofBased,
}

public static class PaymentMethodClassification
{
    public static PaymentMethodGroup Classify(PaymentMethodKind kind) => kind switch
    {
        PaymentMethodKind.Cod => PaymentMethodGroup.Cod,
        PaymentMethodKind.Instapay => PaymentMethodGroup.ProofBased,
        PaymentMethodKind.Wallet => PaymentMethodGroup.ProofBased,
        PaymentMethodKind.BankTransfer => PaymentMethodGroup.ProofBased,
    };
}
