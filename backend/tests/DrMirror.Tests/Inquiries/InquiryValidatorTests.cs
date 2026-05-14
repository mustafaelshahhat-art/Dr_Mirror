using DrMirror.Api.Features.Inquiries.Common;

namespace DrMirror.Tests.Inquiries;

/// <summary>
/// Validator tests for <see cref="SubmitInquiryValidator"/>.
/// Pins down required fields, length limits, and email-format rejection.
/// </summary>
public class InquiryValidatorTests
{
    private static SubmitInquiryRequest Valid(
        string? fullName = null,
        string? email = null,
        string? phone = null,
        string? subject = null,
        string? message = null,
        Guid? productId = null) => new(
            ProductId: productId,
            FullName: fullName ?? "Sara Ahmed",
            Email: email ?? "sara@example.com",
            Phone: phone,
            Subject: subject ?? "Question about your scrubs",
            Message: message ?? "Are these available in size XS?");

    [Fact]
    public void Accepts_a_well_formed_request()
    {
        var v = new SubmitInquiryValidator();
        Assert.True(v.Validate(Valid()).IsValid);
    }

    [Fact]
    public void Accepts_request_without_phone()
    {
        var v = new SubmitInquiryValidator();
        Assert.True(v.Validate(Valid(phone: null)).IsValid);
    }

    [Fact]
    public void Accepts_request_without_productId()
    {
        // General inquiries don't need a productId.
        var v = new SubmitInquiryValidator();
        Assert.True(v.Validate(Valid(productId: null)).IsValid);
    }

    // ── Required fields ──────────────────────────────────────────────────────

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_empty_fullName(string name)
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(fullName: name));
        Assert.False(r.IsValid);
        Assert.Contains(r.Errors, e => e.PropertyName == "FullName");
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    [InlineData("missing@tld")]
    public void Rejects_invalid_email(string email)
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(email: email));
        Assert.False(r.IsValid);
        Assert.Contains(r.Errors, e => e.PropertyName == "Email");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_empty_subject(string subject)
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(subject: subject));
        Assert.False(r.IsValid);
        Assert.Contains(r.Errors, e => e.PropertyName == "Subject");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Rejects_empty_message(string message)
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(message: message));
        Assert.False(r.IsValid);
        Assert.Contains(r.Errors, e => e.PropertyName == "Message");
    }

    // ── Length limits ────────────────────────────────────────────────────────

    [Fact]
    public void Rejects_fullName_over_100_chars()
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(fullName: new string('a', 101)));
        Assert.False(r.IsValid);
    }

    [Fact]
    public void Rejects_subject_over_200_chars()
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(subject: new string('s', 201)));
        Assert.False(r.IsValid);
    }

    [Fact]
    public void Rejects_message_over_2000_chars()
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(message: new string('m', 2001)));
        Assert.False(r.IsValid);
    }

    [Fact]
    public void Rejects_phone_over_30_chars()
    {
        var v = new SubmitInquiryValidator();
        var r = v.Validate(Valid(phone: new string('1', 31)));
        Assert.False(r.IsValid);
    }
}
