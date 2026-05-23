using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Orders;

public class PaymentStatusLabelTests
{
    [Fact]
    public void Cod_confirmed_order_has_cod_kind()
    {
        var order = MakeOrder(PaymentMethodKind.Cod, OrderStatus.Confirmed);
        Assert.Equal(PaymentMethodKind.Cod, order.PaymentMethodKind);
    }

    [Fact]
    public void Cod_preparing_order_has_cod_kind()
    {
        var order = MakeOrder(PaymentMethodKind.Cod, OrderStatus.Preparing);
        Assert.Equal(PaymentMethodKind.Cod, order.PaymentMethodKind);
    }

    [Fact]
    public void Instapay_pending_order_has_instapay_kind()
    {
        var order = MakeOrder(PaymentMethodKind.Instapay, OrderStatus.Pending);
        Assert.Equal(PaymentMethodKind.Instapay, order.PaymentMethodKind);
    }

    [Fact]
    public void Wallet_pending_order_has_wallet_kind()
    {
        var order = MakeOrder(PaymentMethodKind.Wallet, OrderStatus.Pending);
        Assert.Equal(PaymentMethodKind.Wallet, order.PaymentMethodKind);
    }

    [Fact]
    public void Cod_order_is_confirmed_status()
    {
        var fsm = new OrderStateMachine();
        var order = MakeOrder(PaymentMethodKind.Cod, OrderStatus.Pending);
        fsm.Transition(order, OrderStatus.Confirmed, OrderActor.System);

        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.Equal(PaymentMethodKind.Cod, order.PaymentMethodKind);
        Assert.NotNull(order.ConfirmedAt);
    }

    [Fact]
    public void Instapay_order_stays_pending()
    {
        var order = MakeOrder(PaymentMethodKind.Instapay, OrderStatus.Pending);

        Assert.Equal(OrderStatus.Pending, order.Status);
        Assert.Equal(PaymentMethodKind.Instapay, order.PaymentMethodKind);
    }

    private static Order MakeOrder(PaymentMethodKind kind, OrderStatus status) => new()
    {
        Id = Guid.NewGuid(),
        OrderNumber = "DM-2026-000001",
        Status = status,
        PaymentMethodKind = kind,
        BuyerUserId = Guid.NewGuid(),
        Currency = "EGP",
    };
}
