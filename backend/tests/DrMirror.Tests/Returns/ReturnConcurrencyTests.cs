using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Returns.Common;

namespace DrMirror.Tests.Returns;

public class ReturnConcurrencyTests
{
    [Fact]
    public void Second_admin_transition_from_stale_state_is_rejected_as_conflict()
    {
        _ = ReturnStateMachine.ValidateAdminTransition(ReturnStatus.Requested, "Approve");

        var conflict = Assert.Throws<ReturnTransitionConflictException>(() =>
            ReturnStateMachine.ValidateAdminTransition(ReturnStatus.Approved, "Approve"));

        Assert.Contains("Cannot apply Approve", conflict.Message);
    }
}
