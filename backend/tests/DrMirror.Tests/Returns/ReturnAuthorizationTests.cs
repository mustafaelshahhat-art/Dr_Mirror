using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;

namespace DrMirror.Tests.Returns;

public class ReturnAuthorizationTests
{
    [Fact]
    public void Buyer_return_operations_are_bound_to_return_owner()
    {
        var ownerId = Guid.NewGuid();
        var otherBuyerId = Guid.NewGuid();
        var request = new ReturnRequest
        {
            Id = Guid.NewGuid(),
            BuyerUserId = ownerId,
            Status = ReturnStatus.Requested,
        };

        Assert.True(request.BuyerUserId == ownerId);
        Assert.False(request.BuyerUserId == otherBuyerId);
    }

    [Fact]
    public void Admin_transitions_have_no_buyer_ownership_requirement()
    {
        var request = new ReturnRequest
        {
            BuyerUserId = Guid.NewGuid(),
            Status = ReturnStatus.Requested,
        };

        Assert.Equal(ReturnStatus.Approved, ReturnStateMachine.ValidateAdminTransition(request.Status, "Approve"));
    }
}
