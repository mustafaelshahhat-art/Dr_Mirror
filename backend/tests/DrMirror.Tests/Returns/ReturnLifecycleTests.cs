using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;

namespace DrMirror.Tests.Returns;

public class ReturnLifecycleTests
{
    [Theory]
    [InlineData(ReturnStatus.Requested, "Approve", ReturnStatus.Approved)]
    [InlineData(ReturnStatus.Requested, "Reject", ReturnStatus.Rejected)]
    [InlineData(ReturnStatus.Approved, "MarkReceived", ReturnStatus.Received)]
    [InlineData(ReturnStatus.Received, "Complete", ReturnStatus.Completed)]
    public void Admin_transitions_follow_return_state_machine(ReturnStatus from, string action, ReturnStatus to)
    {
        Assert.Equal(to, ReturnStateMachine.ValidateAdminTransition(from, action));
    }

    [Fact]
    public void Buyer_can_cancel_only_requested_returns()
    {
        Assert.True(ReturnStateMachine.CanBuyerCancel(ReturnStatus.Requested));
        Assert.False(ReturnStateMachine.CanBuyerCancel(ReturnStatus.Approved));
        Assert.False(ReturnStateMachine.CanBuyerCancel(ReturnStatus.Received));
        Assert.False(ReturnStateMachine.CanBuyerCancel(ReturnStatus.Completed));
    }

    [Fact]
    public void Submit_return_snapshots_all_order_items()
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderNumber = "DM-RET-1",
            BuyerUserId = Guid.NewGuid(),
            Status = OrderStatus.Delivered,
            Items =
            {
                new OrderItem
                {
                    Id = Guid.NewGuid(),
                    ProductVariantId = Guid.NewGuid(),
                    NameAr = "سكراب",
                    NameEn = "Scrub",
                    Sku = "SCR-1",
                    Size = "M",
                    ColorName = "Blue",
                    ColorNameAr = "أزرق",
                    ColorHex = "#0000ff",
                    UnitPrice = 350m,
                    Quantity = 2,
                },
            },
        };

        var request = new ReturnRequest
        {
            Id = Guid.NewGuid(),
            OrderId = order.Id,
            Order = order,
            BuyerUserId = order.BuyerUserId,
            CustomerReason = "Wrong size",
            Items = order.Items.Select(item => new ReturnRequestItem
            {
                Id = Guid.NewGuid(),
                OrderItemId = item.Id,
                ProductVariantId = item.ProductVariantId,
                NameAr = item.NameAr,
                NameEn = item.NameEn,
                Sku = item.Sku,
                Size = item.Size,
                ColorName = item.ColorName,
                ColorNameAr = item.ColorNameAr,
                ColorHex = item.ColorHex,
                UnitPrice = item.UnitPrice,
                Quantity = item.Quantity,
            }).ToList(),
        };

        var dto = request.ToDto();

        Assert.Equal("DM-RET-1", dto.OrderNumber);
        Assert.Single(dto.Items);
        Assert.Equal(2, dto.Items[0].Quantity);
        Assert.Equal("SCR-1", dto.Items[0].Sku);
    }
}
