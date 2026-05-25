namespace DrMirror.Api.Domain.Entities;

public enum OtpPurpose
{
    Profile = 0,
    Checkout = 1,
}

public enum PhoneVerificationOtpSendStatus
{
    Sending = 0,
    Sent = 1,
    Failed = 2,
}

public class PhoneVerificationOtp
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Egyptian local format (01012345678). Never +20 here.</summary>
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>SHA-256 hex of the 6-digit OTP. Plaintext is never persisted.</summary>
    public string CodeHash { get; set; } = string.Empty;

    /// <summary>Stored for audit and message-context only; excluded from lockout key.</summary>
    public OtpPurpose Purpose { get; set; }

    public DateTimeOffset ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
    public int WrongAttempts { get; set; }
    public int ResendCount { get; set; }

    /// <summary>Shared lockout for all OTP purposes on the same user and phone.</summary>
    public DateTimeOffset? LockedUntil { get; set; }

    public PhoneVerificationOtpSendStatus SendStatus { get; set; } = PhoneVerificationOtpSendStatus.Sending;
    public DateTimeOffset? SendQueuedAt { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public string? SendFailureReason { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
}
