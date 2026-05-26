namespace DrMirror.Api.Domain.Entities;

public class PhoneVerificationOtp
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Code { get; set; } = string.Empty;      // 6-digit plaintext (short-lived, not a password)
    public string Phone { get; set; } = string.Empty;
    public string Purpose { get; set; } = "profile";      // "profile" | "checkout"
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public int AttemptCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
