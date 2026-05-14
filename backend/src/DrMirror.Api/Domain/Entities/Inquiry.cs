using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Domain.Entities;

public sealed class Inquiry
{
    public Guid Id { get; set; }

    /// <summary>Optional — set when the inquiry was submitted from a product page.</summary>
    public Guid? ProductId { get; set; }
    public Product? Product { get; set; }

    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;

    public InquiryStatus Status { get; set; } = InquiryStatus.New;

    public Guid? ReadByUserId { get; set; }
    public User? ReadByUser { get; set; }
    public DateTimeOffset? ReadAt { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
