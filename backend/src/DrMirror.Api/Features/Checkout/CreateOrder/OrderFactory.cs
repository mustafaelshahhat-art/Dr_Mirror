using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Api.Features.Checkout.CreateOrder;

public static class OrderFactory
{
    /// <summary>
    /// Builds a new <see cref="Order"/> entity from a loaded cart and payment method.
    /// Does not write to the database — callers attach the returned entity via
    /// <c>db.Orders.Add(order)</c>. The FSM transition for COD is applied here so
    /// the correct initial status is embedded before the entity is persisted.
    /// </summary>
    public static Order Build(
        string orderNumber,
        Guid buyerUserId,
        ICollection<CartItem> cartItems,
        PaymentMethod paymentMethod,
        ShippingAddress shippingAddress,
        decimal shippingFee,
        string shippingGovernorateNameEn,
        string shippingGovernorateNameAr,
        string? buyerNote,
        OrderStateMachine fsm)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = orderNumber,
            BuyerUserId = buyerUserId,
            Status = OrderStatus.Pending,
            Currency = "EGP",
            ShippingFee = shippingFee,
            ShippingGovernorateNameEn = shippingGovernorateNameEn,
            ShippingGovernorateNameAr = shippingGovernorateNameAr,
            PaymentMethodId = paymentMethod.Id,
            PaymentMethodKind = paymentMethod.Kind,
            PaymentMethodNameEn = paymentMethod.NameEn,
            PaymentMethodNameAr = paymentMethod.NameAr,
            PaymentAccountNumber = paymentMethod.AccountNumber,
            PaymentAccountHolder = paymentMethod.AccountHolder,
            PaymentInstructionsEn = paymentMethod.InstructionsEn,
            PaymentInstructionsAr = paymentMethod.InstructionsAr,
            BuyerNote = buyerNote,
            ShippingAddress = shippingAddress,
        };

        decimal subTotal = 0m;
        foreach (var line in cartItems)
        {
            var v = line.ProductVariant!;
            var p = v.Product!;
            var unit = p.Price;
            var lineTotal = unit * line.Quantity;
            subTotal += lineTotal;

            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = p.Id,
                ProductVariantId = v.Id,
                NameAr = p.NameAr,
                NameEn = p.NameEn,
                Sku = v.Sku,
                Size = v.Size,
                ColorName = v.ColorName,
                ColorNameAr = v.ColorNameAr,
                ColorHex = v.ColorHex,
                PrimaryImageUrl = p.Images
                    .OrderBy(im => im.DisplayOrder)
                    .Select(im => im.Url)
                    .FirstOrDefault(),
                UnitPrice = unit,
                Quantity = line.Quantity,
                LineTotal = lineTotal,
            });
        }

        order.SubTotal = subTotal;
        order.Total = subTotal + order.ShippingFee;

        if (paymentMethod.Kind == PaymentMethodKind.Cod)
        {
            fsm.Transition(order, OrderStatus.Confirmed, OrderActor.System);
        }
        // else: order stays at Pending until the buyer uploads a payment proof.

        return order;
    }
}
