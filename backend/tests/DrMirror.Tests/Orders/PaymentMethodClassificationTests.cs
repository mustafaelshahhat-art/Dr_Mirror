using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Orders;

public class PaymentMethodClassificationTests
{
    [Theory]
    [InlineData(PaymentMethodKind.Cod, PaymentMethodGroup.Cod)]
    [InlineData(PaymentMethodKind.Instapay, PaymentMethodGroup.ProofBased)]
    [InlineData(PaymentMethodKind.Wallet, PaymentMethodGroup.ProofBased)]
    [InlineData(PaymentMethodKind.BankTransfer, PaymentMethodGroup.ProofBased)]
    public void Classify_maps_every_payment_method_kind(PaymentMethodKind kind, PaymentMethodGroup expected)
    {
        Assert.Equal(expected, PaymentMethodClassification.Classify(kind));
    }
}
