using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Infrastructure.Email;

/// <summary>
/// Pure static factories that build <see cref="EmailMessage"/> values from already-loaded
/// domain objects. No I/O — kept separate so the outbox processor and any future caller
/// can share the same subject/body logic without duplicating it.
/// </summary>
public static class OrderEmailMessages
{
    public static EmailMessage OrderConfirmation(Order order)
    {
        var lines = string.Join('\n', order.Items.Select(i =>
            $"  • {i.NameEn} ({i.Size} / {i.ColorName}) ×{i.Quantity} — {i.LineTotal:N2} {order.Currency}"));

        var (subject, body) = order.PaymentMethodKind switch
        {
            PaymentMethodKind.Cod => (
                $"Order {order.OrderNumber} confirmed",
                $"Hi {order.BuyerUser!.FullName},\n\n" +
                $"Your order {order.OrderNumber} is confirmed.\n" +
                $"You will pay {order.Total:N2} {order.Currency} in cash to the courier on delivery.\n\n" +
                $"Items:\n{lines}\n\n— Dr. Mirror"),
            _ => (
                $"Order {order.OrderNumber} — awaiting payment",
                $"Hi {order.BuyerUser!.FullName},\n\n" +
                $"Your order {order.OrderNumber} is awaiting payment ({order.Total:N2} {order.Currency}).\n" +
                $"Transfer the amount to the account shown at checkout and upload a screenshot in your account → orders page.\n\n" +
                $"Items:\n{lines}\n\n— Dr. Mirror"),
        };

        return new EmailMessage(To: order.BuyerUser!.Email!, Subject: subject, TextBody: body);
    }

    public static EmailMessage PaymentReviewNeeded(Order order) =>
        new(
            To: order.BuyerUser!.Email!,
            Subject: $"Order {order.OrderNumber} — payment proof received",
            TextBody:
                $"Hi {order.BuyerUser.FullName},\n\n" +
                $"We received your payment proof for order {order.OrderNumber} and it's now waiting on our team to review " +
                $"(usually within a business day). You'll get another email the moment it's confirmed.\n\n— Dr. Mirror");

    public static EmailMessage StatusChanged(Order order, OrderStatus eventStatus)
    {
        var (subject, body) = eventStatus switch
        {
            OrderStatus.Paid => (
                $"Order {order.OrderNumber} — payment confirmed",
                $"Hi {order.BuyerUser!.FullName},\n\nWe've confirmed your payment. We'll start preparing your order shortly.\n\n— Dr. Mirror"),
            OrderStatus.Preparing => (
                $"Order {order.OrderNumber} — preparing",
                $"Hi {order.BuyerUser!.FullName},\n\nWe're packing your order now. You'll get another email when it's on its way.\n\n— Dr. Mirror"),
            OrderStatus.Shipped => (
                $"Order {order.OrderNumber} — shipped",
                $"Hi {order.BuyerUser!.FullName},\n\nYour order is on its way. Have your phone reachable for the courier.\n\n— Dr. Mirror"),
            OrderStatus.Delivered => (
                $"Order {order.OrderNumber} — delivered",
                $"Hi {order.BuyerUser!.FullName},\n\nYour order was delivered. Thanks for shopping with Dr. Mirror.\n\n— Dr. Mirror"),
            OrderStatus.Cancelled => (
                $"Order {order.OrderNumber} — cancelled",
                $"Hi {order.BuyerUser!.FullName},\n\nYour order has been cancelled.\n" +
                (string.IsNullOrWhiteSpace(order.CancellationReason) ? "" : $"Reason: {order.CancellationReason}\n") +
                $"\n— Dr. Mirror"),
            _ => ($"Order {order.OrderNumber} — status update", $"Status: {eventStatus}"),
        };

        return new EmailMessage(To: order.BuyerUser!.Email!, Subject: subject, TextBody: body);
    }

    public static EmailMessage InquiryReceived(Inquiry inquiry, string adminEmail)
    {
        var productLine = inquiry.Product is not null ? $"Product: {inquiry.Product.NameEn}\n" : "";

        var body =
            $"New inquiry received on Dr. Mirror.\n\n" +
            $"From: {inquiry.FullName} <{inquiry.Email}>" +
            (inquiry.Phone is not null ? $" | {inquiry.Phone}" : "") + "\n" +
            productLine +
            $"Subject: {inquiry.Subject}\n\n" +
            $"Message:\n{inquiry.Message}\n\n" +
            $"View in admin: /admin/inquiries\n" +
            $"— Dr. Mirror System";

        return new EmailMessage(
            To: adminEmail,
            Subject: $"[Dr. Mirror] New inquiry: {inquiry.Subject}",
            TextBody: body);
    }
}
