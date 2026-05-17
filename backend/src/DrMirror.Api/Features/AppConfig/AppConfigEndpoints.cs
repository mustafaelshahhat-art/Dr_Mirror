using DrMirror.Api.Infrastructure.Storage;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Features.AppConfig;

public static class AppConfigEndpoints
{
    public static IEndpointRouteBuilder MapAppConfigEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/app-config", (
                IOptions<FileStorageOptions> fileOpts,
                IOptions<SupportOptions> supportOpts) =>
            Results.Ok(new AppConfigDto(
                PaymentProofUpload: new PaymentProofUploadConfigDto(
                    MaxFileSizeBytes: fileOpts.Value.MaxFileSizeBytes),
                Support: new SupportConfigDto(
                    // null when unset so the SPA can hide the contact affordance entirely.
                    ContactEmail: string.IsNullOrWhiteSpace(supportOpts.Value.ContactEmail)
                        ? null
                        : supportOpts.Value.ContactEmail.Trim()))))
            .WithName("AppConfig.Get")
            .WithTags("AppConfig")
            .WithSummary("Return public runtime configuration needed by the SPA.")
            .AllowAnonymous()
            .Produces<AppConfigDto>(StatusCodes.Status200OK);

        return app;
    }
}

public sealed record AppConfigDto(
    PaymentProofUploadConfigDto PaymentProofUpload,
    SupportConfigDto Support);

public sealed record PaymentProofUploadConfigDto(long MaxFileSizeBytes);

public sealed record SupportConfigDto(string? ContactEmail);

/// <summary>
/// Bound from the "Support" section of configuration.
/// Optional; absence means the SPA hides any contact affordance.
/// </summary>
public sealed class SupportOptions
{
    public string? ContactEmail { get; set; }
}
