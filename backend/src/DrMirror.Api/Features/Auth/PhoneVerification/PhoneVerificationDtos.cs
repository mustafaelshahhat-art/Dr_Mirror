using System.Security.Cryptography;
using System.Text;
using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Features.Auth.PhoneVerification;

public sealed record SendOtpRequest(string Purpose);
public sealed record SendOtpResponse(
    Guid SessionId,
    string MaskedPhone,
    int CooldownSeconds,
    int ResendsRemaining,
    string Status,
    bool PhoneVerificationRequired = false);
public sealed record OtpSendStatusResponse(string Status, string Message, bool CanRetry);
public sealed record VerifyOtpRequest(string Code, string Purpose);
public sealed record VerifyOtpResponse(bool Verified);

public static class PhoneVerificationErrorCodes
{
    public const string NoPhoneOnFile = "NoPhoneOnFile";
    public const string OtpCooldownActive = "OtpCooldownActive";
    public const string OtpSessionLocked = "OtpSessionLocked";
    public const string WhatsAppUnavailable = "WhatsAppUnavailable";
    public const string InvalidOtpCode = "InvalidOtpCode";
    public const string OtpExpiredOrUsed = "OtpExpiredOrUsed";
}

internal static class PhoneVerificationHelpers
{
    public const int CooldownSeconds = 60;
    public const int MaxResends = 3;
    public const int MaxWrongAttempts = 5;
    public static readonly TimeSpan OtpLifetime = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan LockoutDuration = TimeSpan.FromMinutes(30);

    public static bool TryParsePurpose(string? value, out OtpPurpose purpose)
    {
        purpose = value?.Trim().ToLowerInvariant() switch
        {
            "profile" => OtpPurpose.Profile,
            "checkout" => OtpPurpose.Checkout,
            _ => default,
        };
        return value?.Trim().ToLowerInvariant() is "profile" or "checkout";
    }

    public static string HashCode(string code, string secret)
    {
        var key = Encoding.UTF8.GetBytes(secret);
        var message = Encoding.UTF8.GetBytes("phone-otp:" + code);
        return Convert.ToHexString(HMACSHA256.HashData(key, message));
    }

    public static string GenerateCode() => RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6");

    public static string MaskPhone(string phone) => phone.Length == 11
        ? string.Concat(phone.AsSpan(0, 3), "*****", phone.AsSpan(8, 3))
        : "***********";

    public static string MessageBody(string code) => $"رمز تأكيد رقم الهاتف في Dr. Mirror هو: {code}. صالح لمدة 10 دقائق.";

    public static string SendStatusValue(PhoneVerificationOtpSendStatus status) => status switch
    {
        PhoneVerificationOtpSendStatus.Sending => "sending",
        PhoneVerificationOtpSendStatus.Sent => "sent",
        PhoneVerificationOtpSendStatus.Failed => "failed",
        _ => "sending",
    };

    public static int RetryAfterSeconds(DateTimeOffset until, DateTimeOffset now) =>
        Math.Max(1, (int)Math.Ceiling((until - now).TotalSeconds));
}
