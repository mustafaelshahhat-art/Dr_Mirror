namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// One open shopping cart per signed-in user. Guests' carts live in
/// localStorage on the client; on sign-in the SPA POSTs the guest cart
/// to <c>/api/cart/merge</c>, where the rows are folded into this aggregate.
/// </summary>
public class Cart
{
    public Guid Id { get; set; }

    /// <summary>FK to the owning <see cref="User"/>. Unique — one cart per user.</summary>
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    /// <summary>
    /// Bumped on every line mutation. Used by the SPA for optimistic-concurrency
    /// hints and by future cleanup jobs (drop carts inactive for &gt; 30 days).
    /// </summary>
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}
