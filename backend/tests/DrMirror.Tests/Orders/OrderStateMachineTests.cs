using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;

namespace DrMirror.Tests.Orders;

/// <summary>
/// Pin down the FSM transition table so regressions surface as test failures.
/// Each test reads as a sentence: "a Buyer can / cannot move X to Y".
/// </summary>
public class OrderStateMachineTests
{
    private static Order NewOrder(OrderStatus initial) => new()
    {
        Id = Guid.NewGuid(),
        OrderNumber = "DM-2026-000001",
        Status = initial,
        BuyerUserId = Guid.NewGuid(),
        Currency = "EGP",
    };

    // ----- Buyer rights --------------------------------------------------------

    [Theory]
    [InlineData(OrderStatus.Pending, OrderStatus.Cancelled, true)]
    [InlineData(OrderStatus.PendingPaymentReview, OrderStatus.Cancelled, true)]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Cancelled, true)]
    [InlineData(OrderStatus.Paid, OrderStatus.Cancelled, false)]      // post-payment cancel goes through admin
    [InlineData(OrderStatus.Preparing, OrderStatus.Cancelled, false)] // packing started — admin only
    [InlineData(OrderStatus.Shipped, OrderStatus.Cancelled, false)]   // no shipped-cancel without refund
    [InlineData(OrderStatus.Delivered, OrderStatus.Cancelled, false)] // terminal
    [InlineData(OrderStatus.Cancelled, OrderStatus.Cancelled, false)] // terminal
    public void Buyer_can_cancel_only_in_pre_preparing_states(
        OrderStatus from, OrderStatus to, bool expected)
    {
        var fsm = new OrderStateMachine();
        Assert.Equal(expected, fsm.CanTransition(from, to, OrderActor.Buyer));
    }

    [Fact]
    public void Buyer_cannot_advance_to_confirmed()
    {
        var fsm = new OrderStateMachine();
        Assert.False(fsm.CanTransition(OrderStatus.Pending, OrderStatus.Confirmed, OrderActor.Buyer));
    }

    // ----- Admin rights --------------------------------------------------------

    [Theory]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Preparing, true)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Shipped, true)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Delivered, true)]
    [InlineData(OrderStatus.Paid, OrderStatus.Preparing, true)]
    [InlineData(OrderStatus.PendingPaymentReview, OrderStatus.Paid, true)]
    [InlineData(OrderStatus.PendingPaymentReview, OrderStatus.Pending, true)] // reject proof → bounce back
    public void Admin_can_advance_through_the_happy_path(
        OrderStatus from, OrderStatus to, bool expected)
    {
        var fsm = new OrderStateMachine();
        Assert.Equal(expected, fsm.CanTransition(from, to, OrderActor.Admin));
    }

    [Theory]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Cancelled, true)]
    [InlineData(OrderStatus.Preparing, OrderStatus.Cancelled, true)]
    [InlineData(OrderStatus.Paid, OrderStatus.Cancelled, true)]
    [InlineData(OrderStatus.Shipped, OrderStatus.Cancelled, false)] // would need refund flow
    [InlineData(OrderStatus.Delivered, OrderStatus.Cancelled, false)]
    public void Admin_can_cancel_until_shipped(OrderStatus from, OrderStatus to, bool expected)
    {
        var fsm = new OrderStateMachine();
        Assert.Equal(expected, fsm.CanTransition(from, to, OrderActor.Admin));
    }

    [Theory]
    [InlineData(OrderStatus.Confirmed, OrderStatus.Shipped)]   // skips Preparing
    [InlineData(OrderStatus.Confirmed, OrderStatus.Delivered)] // skips multiple states
    [InlineData(OrderStatus.Pending, OrderStatus.Shipped)]
    public void Admin_cannot_skip_states(OrderStatus from, OrderStatus to)
    {
        var fsm = new OrderStateMachine();
        Assert.False(fsm.CanTransition(from, to, OrderActor.Admin));
    }

    [Fact]
    public void Admin_cannot_confirm_pending_online_payment_order()
    {
        var fsm = new OrderStateMachine();

        Assert.False(fsm.CanTransition(OrderStatus.Pending, OrderStatus.Confirmed, OrderActor.Admin));
        Assert.DoesNotContain(OrderStatus.Confirmed, fsm.NextStates(OrderStatus.Pending, OrderActor.Admin));
    }

    [Fact]
    public void System_can_still_confirm_cod_order_from_pending()
    {
        var fsm = new OrderStateMachine();

        Assert.True(fsm.CanTransition(OrderStatus.Pending, OrderStatus.Confirmed, OrderActor.System));
    }

    // ----- Terminal states -----------------------------------------------------

    [Theory]
    [InlineData(OrderStatus.Delivered)]
    [InlineData(OrderStatus.Cancelled)]
    public void Terminal_states_have_no_outgoing_transitions(OrderStatus terminal)
    {
        var fsm = new OrderStateMachine();
        foreach (OrderStatus to in Enum.GetValues<OrderStatus>())
        {
            Assert.False(fsm.CanTransition(terminal, to, OrderActor.Buyer));
            Assert.False(fsm.CanTransition(terminal, to, OrderActor.Admin));
            Assert.False(fsm.CanTransition(terminal, to, OrderActor.System));
        }
    }

    // ----- Side effects --------------------------------------------------------

    [Fact]
    public void Transition_to_Confirmed_sets_ConfirmedAt()
    {
        var fsm = new OrderStateMachine();
        var order = NewOrder(OrderStatus.Pending);

        Assert.Null(order.ConfirmedAt);
        fsm.Transition(order, OrderStatus.Confirmed, OrderActor.System);

        Assert.Equal(OrderStatus.Confirmed, order.Status);
        Assert.NotNull(order.ConfirmedAt);
    }

    [Fact]
    public void Transition_to_Preparing_sets_PreparingAt()
    {
        var fsm = new OrderStateMachine();
        var order = NewOrder(OrderStatus.Confirmed);

        Assert.Null(order.PreparingAt);
        fsm.Transition(order, OrderStatus.Preparing, OrderActor.Admin);

        Assert.Equal(OrderStatus.Preparing, order.Status);
        Assert.NotNull(order.PreparingAt);
    }

    [Fact]
    public void Transition_to_Cancelled_records_reason()
    {
        var fsm = new OrderStateMachine();
        var order = NewOrder(OrderStatus.Confirmed);

        fsm.Transition(order, OrderStatus.Cancelled, OrderActor.Buyer, "Changed my mind");

        Assert.Equal(OrderStatus.Cancelled, order.Status);
        Assert.Equal("Changed my mind", order.CancellationReason);
        Assert.NotNull(order.CancelledAt);
    }

    [Fact]
    public void Transition_throws_on_invalid_move()
    {
        var fsm = new OrderStateMachine();
        var order = NewOrder(OrderStatus.Shipped);

        Assert.Throws<InvalidOperationException>(
            () => fsm.Transition(order, OrderStatus.Cancelled, OrderActor.Buyer));
    }

    // ----- NextStates ----------------------------------------------------------

    [Fact]
    public void NextStates_for_buyer_in_confirmed_is_only_cancelled()
    {
        var fsm = new OrderStateMachine();
        var next = fsm.NextStates(OrderStatus.Confirmed, OrderActor.Buyer);

        Assert.Single(next);
        Assert.Equal(OrderStatus.Cancelled, next[0]);
    }

    [Fact]
    public void NextStates_for_admin_in_terminal_is_empty()
    {
        var fsm = new OrderStateMachine();
        Assert.Empty(fsm.NextStates(OrderStatus.Delivered, OrderActor.Admin));
        Assert.Empty(fsm.NextStates(OrderStatus.Cancelled, OrderActor.Admin));
    }
}
