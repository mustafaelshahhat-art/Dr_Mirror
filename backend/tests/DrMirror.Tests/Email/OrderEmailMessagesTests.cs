using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Email;

namespace DrMirror.Tests.Email;

/// <summary>
/// Pure unit tests for <see cref="OrderEmailMessages"/> — no I/O, no DB.
/// Each builder is exercised in isolation with in-memory domain objects.
/// </summary>
public class OrderEmailMessagesTests
{
    private static User MakeUser(string name = "Test Buyer", string email = "buyer@example.com") =>
        new() { FullName = name, Email = email, UserName = email };

    private static Order MakeOrder(
        PaymentMethodKind kind = PaymentMethodKind.Cod,
        OrderStatus status = OrderStatus.Pending,
        string cancellationReason = "") =>
        new()
        {
            Id = Guid.NewGuid(),
            OrderNumber = "DM-2026-000001",
            BuyerUser = MakeUser(),
            Total = 500m,
            Currency = "EGP",
            PaymentMethodKind = kind,
            Status = status,
            CancellationReason = cancellationReason,
            Items =
            [
                new OrderItem
                {
                    NameEn = "Shirt",
                    NameAr = "قميص",
                    Size = "M",
                    ColorName = "Blue",
                    ColorNameAr = "أزرق",
                    Quantity = 2,
                    LineTotal = 500m,
                },
            ],
        };

    // ── OrderConfirmation ────────────────────────────────────────────────────

    [Fact]
    public void OrderConfirmation_cod_subject_says_confirmed()
    {
        var msg = OrderEmailMessages.OrderConfirmation(MakeOrder(PaymentMethodKind.Cod), "en");
        Assert.Equal("Order DM-2026-000001 confirmed", msg.Subject);
    }

    [Fact]
    public void OrderConfirmation_online_subject_says_awaiting_payment()
    {
        var msg = OrderEmailMessages.OrderConfirmation(MakeOrder(PaymentMethodKind.BankTransfer), "en");
        Assert.Contains("awaiting payment", msg.Subject);
    }

    [Fact]
    public void OrderConfirmation_body_contains_item_line()
    {
        var msg = OrderEmailMessages.OrderConfirmation(MakeOrder(), "en");
        Assert.Contains("Shirt", msg.TextBody);
        Assert.Contains("×2", msg.TextBody);
    }

    [Fact]
    public void OrderConfirmation_to_is_buyer_email()
    {
        var msg = OrderEmailMessages.OrderConfirmation(MakeOrder(), "en");
        Assert.Equal("buyer@example.com", msg.To);
    }

    [Fact]
    public void OrderConfirmation_renders_branded_html_body()
    {
        var msg = OrderEmailMessages.OrderConfirmation(MakeOrder(), "en");
        Assert.NotNull(msg.HtmlBody);
        Assert.Contains("<html", msg.HtmlBody);
        Assert.Contains("Dr.Mirror", msg.HtmlBody);
    }

    [Fact]
    public void OrderConfirmation_arabic_is_not_mixed_and_uses_latin_brand()
    {
        var msg = OrderEmailMessages.OrderConfirmation(MakeOrder(), "ar");
        // Single-language: no English greeting leaks into the Arabic message…
        Assert.DoesNotContain("Hi ", msg.TextBody);
        Assert.DoesNotContain("Your order", msg.TextBody);
        // …and the brand stays Latin "Dr.Mirror", never translated.
        Assert.Contains("Dr.Mirror", msg.TextBody);
        Assert.DoesNotContain("ميرور", msg.TextBody);
        Assert.Equal("ar", System.Text.RegularExpressions.Regex.Match(msg.HtmlBody!, "lang=\"(?<l>[a-z]+)\"").Groups["l"].Value);
    }

    // ── PaymentReviewNeeded ──────────────────────────────────────────────────

    [Fact]
    public void PaymentReviewNeeded_subject_contains_order_number()
    {
        var msg = OrderEmailMessages.PaymentReviewNeeded(MakeOrder(), "en");
        Assert.Contains("DM-2026-000001", msg.Subject);
    }

    [Fact]
    public void PaymentReviewNeeded_body_mentions_review()
    {
        var msg = OrderEmailMessages.PaymentReviewNeeded(MakeOrder(), "en");
        Assert.Contains("payment proof", msg.TextBody);
    }

    // ── StatusChanged ────────────────────────────────────────────────────────

    [Theory]
    [InlineData(OrderStatus.Paid, "payment confirmed")]
    [InlineData(OrderStatus.Preparing, "preparing")]
    [InlineData(OrderStatus.Shipped, "shipped")]
    [InlineData(OrderStatus.Delivered, "delivered")]
    [InlineData(OrderStatus.Cancelled, "cancelled")]
    public void StatusChanged_subject_reflects_event_status(OrderStatus eventStatus, string expectedFragment)
    {
        var msg = OrderEmailMessages.StatusChanged(MakeOrder(), eventStatus, "en");
        Assert.Contains(expectedFragment, msg.Subject, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void StatusChanged_cancelled_with_reason_includes_reason_in_body()
    {
        var order = MakeOrder(status: OrderStatus.Cancelled, cancellationReason: "Out of stock");
        var msg = OrderEmailMessages.StatusChanged(order, OrderStatus.Cancelled, "en");
        Assert.Contains("Out of stock", msg.TextBody);
    }

    [Fact]
    public void StatusChanged_cancelled_without_reason_omits_reason_line()
    {
        var order = MakeOrder(status: OrderStatus.Cancelled, cancellationReason: "");
        var msg = OrderEmailMessages.StatusChanged(order, OrderStatus.Cancelled, "en");
        Assert.DoesNotContain("Reason:", msg.TextBody);
    }

    // ── InquiryConfirmation (customer-facing) ─────────────────────────────────

    [Fact]
    public void InquiryConfirmation_to_is_customer_email()
    {
        var inquiry = new Inquiry { FullName = "Alice", Email = "alice@example.com", Subject = "Hello", Message = "Test" };
        var msg = OrderEmailMessages.InquiryConfirmation(inquiry, "en");
        Assert.Equal("alice@example.com", msg.To);
        Assert.Contains("Dr.Mirror", msg.Subject);
    }

    // ── InquiryReceived (admin) ──────────────────────────────────────────────

    [Fact]
    public void InquiryReceived_to_is_admin_email()
    {
        var inquiry = new Inquiry { FullName = "Alice", Email = "alice@example.com", Subject = "Hello", Message = "Test" };
        var msg = OrderEmailMessages.InquiryReceived(inquiry, "admin@drmirror.com");
        Assert.Equal("admin@drmirror.com", msg.To);
    }

    [Fact]
    public void InquiryReceived_subject_contains_inquiry_subject()
    {
        var inquiry = new Inquiry { FullName = "Alice", Email = "alice@example.com", Subject = "Need help", Message = "Test" };
        var msg = OrderEmailMessages.InquiryReceived(inquiry, "admin@drmirror.com");
        Assert.Contains("Need help", msg.Subject);
    }

    [Fact]
    public void InquiryReceived_body_contains_sender_details()
    {
        var inquiry = new Inquiry { FullName = "Alice", Email = "alice@example.com", Phone = "+201000000000", Subject = "Help", Message = "Please help" };
        var msg = OrderEmailMessages.InquiryReceived(inquiry, "admin@drmirror.com");
        Assert.Contains("Alice", msg.TextBody);
        Assert.Contains("alice@example.com", msg.TextBody);
        Assert.Contains("+201000000000", msg.TextBody);
    }

    [Fact]
    public void InquiryReceived_body_includes_product_line_when_product_set()
    {
        var inquiry = new Inquiry
        {
            FullName = "Bob",
            Email = "bob@example.com",
            Subject = "Q",
            Message = "M",
            Product = new Product { NameEn = "Fancy Shirt", NameAr = "قميص", Slug = "fancy-shirt", Price = 100m },
        };
        var msg = OrderEmailMessages.InquiryReceived(inquiry, "admin@drmirror.com");
        Assert.Contains("Fancy Shirt", msg.TextBody);
    }
}
