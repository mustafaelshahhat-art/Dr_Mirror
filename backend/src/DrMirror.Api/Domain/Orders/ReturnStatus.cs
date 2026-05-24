namespace DrMirror.Api.Domain.Orders;

public enum ReturnStatus
{
    Requested = 1,
    Approved = 2,
    Rejected = 3,
    Received = 4,
    Completed = 5,
    Cancelled = 6,
}
