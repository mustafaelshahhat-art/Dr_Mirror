using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Features.Orders.Returns.Common;

public sealed class ReturnTransitionConflictException : Exception
{
    public ReturnTransitionConflictException(string message) : base(message) { }
}

public static class ReturnStateMachine
{
    public static bool CanBuyerCancel(ReturnStatus status) => status == ReturnStatus.Requested;

    public static ReturnStatus ValidateAdminTransition(ReturnStatus current, string action) => action switch
    {
        "Approve" when current == ReturnStatus.Requested => ReturnStatus.Approved,
        "Reject" when current == ReturnStatus.Requested => ReturnStatus.Rejected,
        "MarkReceived" when current == ReturnStatus.Approved => ReturnStatus.Received,
        "Complete" when current == ReturnStatus.Received => ReturnStatus.Completed,
        "Approve" or "Reject" or "MarkReceived" or "Complete" => throw new ReturnTransitionConflictException(
            $"Cannot apply {action} to a return in {current} state."),
        _ => throw new ArgumentException("Unknown return transition action.", nameof(action)),
    };
}
