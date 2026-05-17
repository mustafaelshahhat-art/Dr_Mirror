using DrMirror.Api.Infrastructure.Storage;

namespace DrMirror.Tests.Orders;

/// <summary>
/// Guard tests for the payment-proof MIME allow-list. Keeping these centralised
/// stops PDFs (or any non-image MIME) from sneaking back into the allow-list,
/// since the buyer + admin proof preview screens render via <c>&lt;img&gt;</c>
/// and would show a broken/misleading preview for a PDF.
///
/// Mirrors <c>UploadPaymentProofEndpoint</c>'s allow-list check:
///   <c>PaymentProofContentTypes ∪ AllowedContentTypes</c>.
/// </summary>
public class PaymentProofAllowListTests
{
    private static readonly string[] ExpectedImageTypes =
    {
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
    };

    [Fact]
    public void PaymentProofContentTypes_does_not_contain_application_pdf()
    {
        var o = new FileStorageOptions();
        Assert.DoesNotContain("application/pdf", o.PaymentProofContentTypes, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void AllowedContentTypes_does_not_contain_application_pdf()
    {
        // AllowedContentTypes is the backwards-compatible fallback list that
        // UploadPaymentProofEndpoint also consults. PDF must be excluded here too.
        var o = new FileStorageOptions();
        Assert.DoesNotContain("application/pdf", o.AllowedContentTypes, StringComparer.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("image/jpeg")]
    [InlineData("image/png")]
    [InlineData("image/webp")]
    [InlineData("image/heic")]
    [InlineData("image/heif")]
    public void PaymentProofContentTypes_accepts_supported_image_types(string contentType)
    {
        var o = new FileStorageOptions();
        Assert.Contains(contentType, o.PaymentProofContentTypes, StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public void PaymentProofContentTypes_matches_expected_image_only_set()
    {
        var o = new FileStorageOptions();
        Assert.Equal(
            ExpectedImageTypes.OrderBy(s => s, StringComparer.OrdinalIgnoreCase),
            o.PaymentProofContentTypes.OrderBy(s => s, StringComparer.OrdinalIgnoreCase));
    }

    /// <summary>
    /// Mirrors the union check in <c>UploadPaymentProofEndpoint.HandleAsync</c>:
    /// a content-type is accepted iff it appears in
    /// <c>PaymentProofContentTypes</c> OR <c>AllowedContentTypes</c>.
    /// </summary>
    [Theory]
    [InlineData("image/jpeg", true)]
    [InlineData("image/png", true)]
    [InlineData("image/webp", true)]
    [InlineData("image/heic", true)]
    [InlineData("image/heif", true)]
    [InlineData("application/pdf", false)]
    [InlineData("application/octet-stream", false)]
    [InlineData("text/plain", false)]
    public void Endpoint_allow_list_union_matches_image_only_policy(string contentType, bool expected)
    {
        var o = new FileStorageOptions();
        var accepted =
            o.PaymentProofContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase) ||
            o.AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);
        Assert.Equal(expected, accepted);
    }
}
