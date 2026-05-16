using System.ComponentModel.DataAnnotations;
using DrMirror.Api.Infrastructure.Email;
using DrMirror.Api.Infrastructure.Storage;

namespace DrMirror.Tests.Config;

/// <summary>
/// Verifies that <see cref="FileStorageOptions"/> and <see cref="EmailOptions"/>
/// reject unknown providers and missing credentials at startup validation time.
/// </summary>
public class OptionsValidationTests
{
    // ── FileStorageOptions ────────────────────────────────────────────────────

    [Theory]
    [InlineData("s3")]
    [InlineData("azure")]
    [InlineData("ftp")]
    [InlineData("")]
    public void FileStorage_unknown_provider_is_rejected(string provider)
    {
        var opts = new FileStorageOptions { Provider = provider };
        var results = Validate(opts);
        Assert.Contains(results, r => r.ErrorMessage!.Contains("Unknown FileStorage:Provider"));
    }

    [Fact]
    public void FileStorage_local_provider_is_valid()
    {
        var opts = new FileStorageOptions { Provider = "local" };
        Assert.Empty(Validate(opts));
    }

    [Fact]
    public void FileStorage_cloudinary_missing_credentials_is_rejected()
    {
        var opts = new FileStorageOptions { Provider = "cloudinary" };
        var results = Validate(opts);
        Assert.Contains(results, r => r.ErrorMessage!.Contains("Cloudinary credentials"));
    }

    [Fact]
    public void FileStorage_cloudinary_with_credentials_is_valid()
    {
        var opts = new FileStorageOptions
        {
            Provider = "cloudinary",
            CloudinaryCloudName = "mycloud",
            CloudinaryApiKey = "key123",
            CloudinaryApiSecret = "secret456",
        };
        Assert.Empty(Validate(opts));
    }

    [Theory]
    [InlineData("local")]
    [InlineData("LOCAL")]
    [InlineData("Local")]
    [InlineData("cloudinary")]
    [InlineData("CLOUDINARY")]
    public void FileStorage_known_providers_are_case_insensitive(string provider)
    {
        var opts = new FileStorageOptions
        {
            Provider = provider,
            // Supply Cloudinary creds so the second guard doesn't fire.
            CloudinaryCloudName = "c",
            CloudinaryApiKey = "k",
            CloudinaryApiSecret = "s",
        };
        Assert.DoesNotContain(Validate(opts), r => r.ErrorMessage!.Contains("Unknown FileStorage:Provider"));
    }

    // ── EmailOptions ──────────────────────────────────────────────────────────

    [Theory]
    [InlineData("sendgrid")]
    [InlineData("ses")]
    [InlineData("smtp")]
    [InlineData("")]
    public void Email_unknown_provider_is_rejected(string provider)
    {
        var opts = new EmailOptions { Provider = provider };
        var results = Validate(opts);
        Assert.Contains(results, r => r.ErrorMessage!.Contains("Unknown Email:Provider"));
    }

    [Fact]
    public void Email_logonly_provider_is_valid()
    {
        var opts = new EmailOptions { Provider = "logonly" };
        Assert.Empty(Validate(opts));
    }

    [Fact]
    public void Email_mailkit_without_smtp_is_rejected()
    {
        var opts = new EmailOptions { Provider = "mailkit" };
        var results = Validate(opts);
        Assert.Contains(results, r => r.ErrorMessage!.Contains("SmtpHost"));
    }

    [Fact]
    public void Email_mailkit_with_smtp_is_valid()
    {
        var opts = new EmailOptions
        {
            Provider = "mailkit",
            SmtpHost = "smtp.gmail.com",
            SmtpUsername = "user@example.com",
            SmtpPassword = "app-password",
        };
        Assert.Empty(Validate(opts));
    }

    [Theory]
    [InlineData("logonly")]
    [InlineData("LOGONLY")]
    [InlineData("mailkit")]
    [InlineData("MAILKIT")]
    public void Email_known_providers_are_case_insensitive(string provider)
    {
        var opts = new EmailOptions
        {
            Provider = provider,
            SmtpHost = "smtp.example.com",
            SmtpUsername = "u",
            SmtpPassword = "p",
        };
        Assert.DoesNotContain(Validate(opts), r => r.ErrorMessage!.Contains("Unknown Email:Provider"));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static IList<ValidationResult> Validate(IValidatableObject obj)
    {
        var ctx = new ValidationContext(obj);
        return obj.Validate(ctx).ToList();
    }
}
