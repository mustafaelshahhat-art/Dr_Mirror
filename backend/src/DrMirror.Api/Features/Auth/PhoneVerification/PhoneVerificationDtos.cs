namespace DrMirror.Api.Features.Auth.PhoneVerification;

public sealed record SendOtpRequest(string? Purpose = "profile", string? Phone = null);

public sealed record SendOtpResponse(Guid SessionId, string Status, string? MaskedPhone);

public sealed record VerifyOtpRequest(string Code, Guid SessionId);

public sealed record VerifyOtpResponse(bool Verified, string? Error = null);

internal static class PhoneVerificationErrorCodes
{
    public const string NoPhoneOnFile = "NO_PHONE_ON_FILE";
    public const string OtpNotFound = "OTP_NOT_FOUND";
    public const string OtpExpired = "OTP_EXPIRED";
    public const string OtpInvalid = "OTP_INVALID";
    public const string OtpTooManyAttempts = "OTP_TOO_MANY_ATTEMPTS";
    public const string SendFailed = "SEND_FAILED";
    public const string AlreadyVerified = "ALREADY_VERIFIED";
}

internal static class PhoneVerificationHelpers
{
    public static bool TryParsePurpose(string? raw, out string purpose)
    {
        purpose = raw?.Trim().ToLowerInvariant() ?? "profile";
        return purpose is "profile" or "checkout";
    }

    public static string MaskPhone(string phone)
    {
        if (phone.Length <= 4) return new string('*', phone.Length);
        return phone[..2] + new string('*', phone.Length - 4) + phone[^2..];
    }
}
