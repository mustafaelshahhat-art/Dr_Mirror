using DrMirror.Api.Shared.Startup;
using Microsoft.Extensions.Configuration;

namespace DrMirror.Tests.Startup;

public class ProdSecretsValidatorTests
{
    private static IConfiguration BuildConfig(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();

    private const string LongJwtSecret =
        "prod-secret-key-that-is-definitely-longer-than-sixty-four-characters-easy!!";

    private static Dictionary<string, string?> ValidBase() => new()
    {
        ["ConnectionStrings:Default"] = "Server=db;Database=Dr;Trusted_Connection=True;",
        ["Jwt:Secret"] = LongJwtSecret,
        ["Jwt:Issuer"] = "drmirror.com",
        ["Jwt:Audience"] = "drmirror.com",
        ["Admin:SeedEmail"] = "admin@drmirror.com",
        ["Admin:SeedPassword"] = "StrongPassword!1",
        ["Cors:AllowedOrigins:0"] = "https://app.drmirror.com",
        ["Auth:UseCrossSiteCookies"] = "true",
    };

    [Fact]
    public void Valid_configuration_does_not_throw()
    {
        var config = BuildConfig(ValidBase());
        var ex = Record.Exception(() => ProdSecretsValidator.Validate(config));
        Assert.Null(ex);
    }

    [Fact]
    public void Missing_jwt_secret_is_listed_in_aggregated_exception()
    {
        var values = ValidBase();
        values["Jwt:Secret"] = null;
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("Jwt:Secret", ex.MissingKeys);
    }

    [Fact]
    public void Short_jwt_secret_is_rejected_with_length_invariant_note()
    {
        var values = ValidBase();
        values["Jwt:Secret"] = "too-short-secret";
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains(ex.MissingKeys, k => k.StartsWith("Jwt:Secret") && k.Contains("64"));
    }

    [Fact]
    public void Missing_cors_allowlist_is_listed()
    {
        var values = ValidBase();
        values.Remove("Cors:AllowedOrigins:0");
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains(ex.MissingKeys, k => k.StartsWith("Cors:AllowedOrigins"));
    }

    [Fact]
    public void Missing_connection_string_is_listed()
    {
        var values = ValidBase();
        values["ConnectionStrings:Default"] = null;
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("ConnectionStrings:Default", ex.MissingKeys);
    }

    [Fact]
    public void All_missing_keys_are_listed_in_one_message()
    {
        var values = new Dictionary<string, string?>(); // empty
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("ConnectionStrings:Default", ex.MissingKeys);
        Assert.Contains("Jwt:Secret", ex.MissingKeys);
        Assert.Contains(ex.MissingKeys, k => k.StartsWith("Cors:AllowedOrigins"));
        Assert.Contains("Jwt:Issuer", ex.MissingKeys);
        Assert.Contains("Jwt:Audience", ex.MissingKeys);
        Assert.Contains("Admin:SeedEmail", ex.MissingKeys);
        Assert.Contains("Admin:SeedPassword", ex.MissingKeys);
        Assert.Equal(7, ex.MissingKeys.Count);
    }

    [Fact]
    public void Missing_admin_seed_email_is_listed()
    {
        var values = ValidBase();
        values.Remove("Admin:SeedEmail");
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("Admin:SeedEmail", ex.MissingKeys);
    }

    [Fact]
    public void Missing_admin_seed_password_is_listed()
    {
        var values = ValidBase();
        values["Admin:SeedPassword"] = null;
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("Admin:SeedPassword", ex.MissingKeys);
    }

    [Fact]
    public void Short_admin_seed_password_is_rejected()
    {
        var values = ValidBase();
        values["Admin:SeedPassword"] = "Short!1";
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains(ex.MissingKeys, k => k.StartsWith("Admin:SeedPassword") && k.Contains("12"));
    }

    [Fact]
    public void Cloudinary_keys_required_only_when_provider_is_cloudinary()
    {
        var withProvider = ValidBase();
        withProvider["FileStorage:Provider"] = "cloudinary";
        var config = BuildConfig(withProvider);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("FileStorage:CloudinaryCloudName", ex.MissingKeys);
        Assert.Contains("FileStorage:CloudinaryApiKey", ex.MissingKeys);
        Assert.Contains("FileStorage:CloudinaryApiSecret", ex.MissingKeys);
    }

    [Fact]
    public void Mailkit_keys_required_only_when_provider_is_mailkit()
    {
        var withProvider = ValidBase();
        withProvider["Email:Provider"] = "mailkit";
        var config = BuildConfig(withProvider);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("Email:FromAddress", ex.MissingKeys);
        Assert.Contains("Email:SmtpHost", ex.MissingKeys);
        Assert.Contains("Email:SmtpPort", ex.MissingKeys);
        Assert.Contains("Email:SmtpUsername", ex.MissingKeys);
        Assert.Contains("Email:SmtpPassword", ex.MissingKeys);
        Assert.Contains("Email:FrontendBaseUrl", ex.MissingKeys);
    }

    [Fact]
    public void Missing_cross_site_cookie_flag_is_listed_when_cors_origins_present()
    {
        var values = ValidBase();
        values.Remove("Auth:UseCrossSiteCookies");
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains(ex.MissingKeys, k => k.StartsWith("Auth:UseCrossSiteCookies"));
    }

    [Fact]
    public void Missing_jwt_issuer_is_listed()
    {
        var values = ValidBase();
        values.Remove("Jwt:Issuer");
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("Jwt:Issuer", ex.MissingKeys);
    }

    [Fact]
    public void Missing_jwt_audience_is_listed()
    {
        var values = ValidBase();
        values.Remove("Jwt:Audience");
        var config = BuildConfig(values);

        var ex = Assert.Throws<ProdSecretsValidationException>(
            () => ProdSecretsValidator.Validate(config));
        Assert.Contains("Jwt:Audience", ex.MissingKeys);
    }
}
