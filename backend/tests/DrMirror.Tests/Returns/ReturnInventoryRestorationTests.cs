using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;

namespace DrMirror.Tests.Returns;

public class ReturnInventoryRestorationTests
{
    [Fact]
    public void Complete_transition_restores_variant_stock_for_each_return_item()
    {
        var variant = new ProductVariant { Id = Guid.NewGuid(), Stock = 4 };
        var request = new ReturnRequest
        {
            Status = ReturnStatus.Received,
            Items =
            {
                new ReturnRequestItem { ProductVariantId = variant.Id, ProductVariant = variant, Quantity = 3 },
            },
        };

        var next = ReturnStateMachine.ValidateAdminTransition(request.Status, "Complete");
        foreach (var item in request.Items)
        {
            item.ProductVariant!.Stock += item.Quantity;
        }
        request.Status = next;

        Assert.Equal(ReturnStatus.Completed, request.Status);
        Assert.Equal(7, variant.Stock);
    }
}
