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

        var corsOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>();
        if (corsOrigins is null || corsOrigins.Length == 0)
        {
            missing.Add("Cors:AllowedOrigins (must contain at least one origin)");
        }

        Require(configuration, "ConnectionStrings:Default", missing);

        var jwtSecret = configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(jwtSecret))
        {
            missing.Add("Jwt:Secret");
        }
        else if (jwtSecret.Length < 64)
        {
            missing.Add("Jwt:Secret (must be at least 64 characters)");
        }

        if (string.Equals(configuration["FileStorage:Provider"], "cloudinary", StringComparison.OrdinalIgnoreCase))
        {
            Require(configuration, "FileStorage:CloudinaryCloudName", missing);
            Require(configuration, "FileStorage:CloudinaryApiKey", missing);
            Require(configuration, "FileStorage:CloudinaryApiSecret", missing);
        }

        if (string.Equals(configuration["Email:Provider"], "mailkit", StringComparison.OrdinalIgnoreCase))
        {
            Require(configuration, "Email:FromAddress", missing);
            Require(configuration, "Email:SmtpHost", missing);
            Require(configuration, "Email:SmtpPort", missing);
            Require(configuration, "Email:SmtpUsername", missing);
            Require(configuration, "Email:SmtpPassword", missing);
        }

        if (missing.Count > 0)
        {
            throw new ProdSecretsValidationException(missing);
        }
    }

    private static void Require(IConfiguration configuration, string key, List<string> missing)
    {
        if (string.IsNullOrWhiteSpace(configuration[key]))
        {
            missing.Add(key);
        }
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
