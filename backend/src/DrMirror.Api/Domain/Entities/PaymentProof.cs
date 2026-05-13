using DrMirror.Api.Domain.Orders;

namespace DrMirror.Api.Domain.Entities;

/// <summary>
/// One payment-proof image attached to an <see cref="Order"/>. Buyers can
/// upload more than one (re-uploads after rejection); the latest
/// <see cref="PaymentProofStatus.Pending"/> proof is the one admin reviews.
/// </summary>
public class PaymentProof
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }
    public Order? Order { get; set; }

    /// <summary>Publicly-reachable URL of the uploaded image (Cloudinary CDN or local /uploads).</summary>
    public string FileUrl { get; set; } = string.Empty;

    /// <summary>
    /// Storage-driver-specific public id used to delete the file later
    /// (Cloudinary public_id or local relative path).
    /// </summary>
    public string FileKey { get; set; } = string.Empty;

    public string ContentType { get; set; } = string.Empty;

    public long SizeBytes { get; set; }

    public PaymentProofStatus Status { get; set; } = PaymentProofStatus.Pending;

    /// <summary>Admin who reviewed the proof. Null until reviewed.</summary>
    public Guid? ReviewedByUserId { get; set; }
    public User? ReviewedByUser { get; set; }

    public DateTimeOffset? ReviewedAt { get; set; }

    /// <summary>Admin's note attached to the review (rejection reason or approval comment).</summary>
    public string? ReviewNote { get; set; }

    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;
}
