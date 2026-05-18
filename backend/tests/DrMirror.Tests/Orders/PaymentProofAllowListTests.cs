using DrMirror.Api.Infrastructure.Storage;

namespace DrMirror.Tests.Orders;

/// <summary>
/// Guard tests for the payment-proof MIME allow-list.
///
/// Mirrors <c>UploadPaymentProofEndpoint</c>'s allow-list check:
///   <c>PaymentProofContentTypes</c>.
/// </summary>
public class PaymentProofAllowListTests
{
    private static readonly string[] ExpectedProofTypes =
    {
        "image/jpeg",
        "image/png",
        "application/pdf",
    };

    [Fact]
    public void PaymentProofContentTypes_contains_application_pdf()
    {
        var o = new FileStorageOptions();
        Assert.Contains("application/pdf", o.PaymentProofContentTypes, StringComparer.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("application/pdf")]
    public void PaymentProofContentTypes_accepts_supported_proof_types(string contentType)
    {
        var o = new FileStorageOptions();
        Assert.Contains(contentType, o.PaymentProofContentTypes, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void PaymentProofContentTypes_matches_expected_proof_set()
    {
        var o = new FileStorageOptions();
        Assert.Equal(
            ExpectedProofTypes.OrderBy(s => s, StringComparer.OrdinalIgnoreCase),
            o.PaymentProofContentTypes.OrderBy(s => s, StringComparer.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Mirrors the check in <c>UploadPaymentProofEndpoint.HandleAsync</c>:
    /// a content-type is accepted iff it appears in <c>PaymentProofContentTypes</c>.
    /// </summary>
    [Theory]
    [InlineData("image/jpeg", true)]
    [InlineData("image/png", true)]
    [InlineData("image/webp", false)]
    [InlineData("image/heic", false)]
    [InlineData("image/heif", false)]
    [InlineData("application/pdf", true)]
    [InlineData("application/octet-stream", false)]
    [InlineData("text/plain", false)]
    public void Endpoint_allow_list_matches_payment_proof_policy(string contentType, bool expected)
    {
        var o = new FileStorageOptions();
        var accepted = o.PaymentProofContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);
        Assert.Equal(expected, accepted);
    }
}
