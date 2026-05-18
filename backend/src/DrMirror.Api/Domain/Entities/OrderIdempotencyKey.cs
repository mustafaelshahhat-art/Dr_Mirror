namespace DrMirror.Api.Domain.Entities;

public sealed class OrderIdempotencyKey
{
    public Guid Key { get; set; }
    public Guid OrderId { get; set; }
    public Order? Order { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public DateTimeOffset CreatedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}
