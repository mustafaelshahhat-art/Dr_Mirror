namespace DrMirror.Api.Shared.Startup;

/// <summary>
/// Aggregated production-secret validator. Re-usable from both
/// <c>Program.cs</c> (at boot) and the CI pre-deploy script
/// (<c>backend/scripts/verify-prod-secrets.ps1</c>) so the build fails before
/// a missing or malformed secret can crash the running API.
/// </summary>
public static class ProdSecretsValidator
{
    /// <summary>
    /// Validates every required production secret. On failure throws
    /// <see cref="ProdSecretsValidationException"/> whose
    /// <see cref="ProdSecretsValidationException.MissingKeys"/> property lists
    /// every offending key (so the caller can surface them all in one log line
    /// instead of fix-one-rebuild-find-next).
    /// </summary>
    public static void Validate(IConfiguration configuration)
    {
        var missing = new List<string>();

        // CORS — at least one allowed origin required.
        var corsOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (corsOrigins is null || corsOrigins.Length == 0)
            missing.Add("Cors:AllowedOrigins (must contain at least one origin)");

        // Cross-site cookies — required when CORS origins point to a different
        // domain than the API. Without SameSite=None the browser silently strips
        // the refresh cookie from cross-origin POST requests, breaking session
        // persistence on every page reload.
        if (corsOrigins is { Length: > 0 })
        {
            var useCrossSite = configuration.GetValue<bool>("Auth:UseCrossSiteCookies");
            if (!useCrossSite)
                missing.Add(
                    "Auth:UseCrossSiteCookies (must be true when CORS origins are configured — " +
                    "the refresh cookie needs SameSite=None for cross-origin session restore)");
        }

        // Database.
        Require(configuration, "ConnectionStrings:Default", missing);

        // JWT — secret length enforced; issuer and audience must be explicit in production.
        var jwtSecret = configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
            missing.Add("Jwt:Secret");
        else if (jwtSecret.Length < 64)
            missing.Add("Jwt:Secret (must be at least 64 characters)");

        Require(configuration, "Jwt:Issuer", missing);
        Require(configuration, "Jwt:Audience", missing);

        // File storage — Cloudinary credentials required when provider = cloudinary.
        if (string.Equals(configuration["FileStorage:Provider"], "cloudinary", StringComparison.OrdinalIgnoreCase))
        {
            Require(configuration, "FileStorage:CloudinaryCloudName", missing);
            Require(configuration, "FileStorage:CloudinaryApiKey", missing);
            Require(configuration, "FileStorage:CloudinaryApiSecret", missing);
        }

        // Email — SMTP credentials and frontend URL required when provider = mailkit.
        if (string.Equals(configuration["Email:Provider"], "mailkit", StringComparison.OrdinalIgnoreCase))
        {
            Require(configuration, "Email:FromAddress", missing);
            Require(configuration, "Email:SmtpHost", missing);
            Require(configuration, "Email:SmtpPort", missing);
            Require(configuration, "Email:SmtpUsername", missing);
            Require(configuration, "Email:SmtpPassword", missing);
            Require(configuration, "Email:FrontendBaseUrl", missing);
        }

        // Admin seed account — email and password must be supplied so the seeder
        // never auto-generates a plaintext password that ends up in the log file.
        Require(configuration, "Admin:SeedEmail", missing);
        var adminPassword = configuration["Admin:SeedPassword"];
        if (string.IsNullOrWhiteSpace(adminPassword))
            missing.Add("Admin:SeedPassword");
        else if (adminPassword.Length < 12)
            missing.Add("Admin:SeedPassword (must be at least 12 characters)");

        // WhatsApp sidecar — URL and shared key required when integration is enabled.
        if (string.Equals(configuration["WhatsApp:Enabled"], "true", StringComparison.OrdinalIgnoreCase)
            || configuration.GetValue<bool>("WhatsApp:Enabled"))
        {
            Require(configuration, "WhatsApp:ServiceUrl", missing);

            var waKey = configuration["WhatsApp:InternalApiKey"];
            if (string.IsNullOrWhiteSpace(waKey))
                missing.Add("WhatsApp:InternalApiKey");
            else if (waKey.Length < 32)
                missing.Add("WhatsApp:InternalApiKey (must be at least 32 characters)");
        }

        if (missing.Count > 0)
            throw new ProdSecretsValidationException(missing);
    }

    private static void Require(IConfiguration configuration, string key, List<string> missing)
    {
        if (string.IsNullOrWhiteSpace(configuration[key]))
            missing.Add(key);
    }
}

/// <summary>
/// Thrown by <see cref="ProdSecretsValidator.Validate"/> when one or more required
/// keys are missing or invalid. Inherits <see cref="InvalidOperationException"/>
/// so existing startup tests continue to assert via that base type.
/// </summary>
public sealed class ProdSecretsValidationException : InvalidOperationException
{
    public IReadOnlyList<string> MissingKeys { get; }

    public ProdSecretsValidationException(IReadOnlyList<string> missingKeys)
        : base(BuildMessage(missingKeys))
    {
        MissingKeys = missingKeys;
    }

    private static string BuildMessage(IReadOnlyList<string> missingKeys) =>
        "Production-secret validation failed. Missing or invalid keys:" + Environment.NewLine +
        string.Join(Environment.NewLine, missingKeys.Select(k => "  - " + k));
}
