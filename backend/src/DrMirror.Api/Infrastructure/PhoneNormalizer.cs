using System.Text.RegularExpressions;

namespace DrMirror.Api.Infrastructure;

public static partial class PhoneNormalizer
{
    [GeneratedRegex(@"^0(10|11|12|15)\d{8}$")]
    private static partial Regex EgyptianLocalRegex();

    public static string ToE164(string localPhone)
    {
        if (string.IsNullOrEmpty(localPhone) || localPhone.Length < 2)
            throw new ArgumentException($"Cannot convert '{localPhone}' to E.164: expected 11-digit Egyptian local format.", nameof(localPhone));
        return "+20" + localPhone[1..];
    }

    public static bool IsValidEgyptianLocal(string phone) => EgyptianLocalRegex().IsMatch(phone);
}
