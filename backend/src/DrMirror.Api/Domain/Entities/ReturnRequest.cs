using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Domain.Entities;

public class ReturnRequest
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Order? Order { get; set; }
    public Guid BuyerUserId { get; set; }
    public User? BuyerUser { get; set; }
    public ReturnStatus Status { get; set; } = ReturnStatus.Requested;
    public string CustomerReason { get; set; } = string.Empty;
    public string? AdminNote { get; set; }
    public Guid? ReviewedByAdminId { get; set; }
    public User? ReviewedByAdmin { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ReviewedAt { get; set; }
    public DateTimeOffset? ReceivedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public DateTimeOffset? CancelledAt { get; set; }
    public byte[]? RowVersion { get; set; }
    public ICollection<ReturnRequestItem> Items { get; set; } = new List<ReturnRequestItem>();
}
