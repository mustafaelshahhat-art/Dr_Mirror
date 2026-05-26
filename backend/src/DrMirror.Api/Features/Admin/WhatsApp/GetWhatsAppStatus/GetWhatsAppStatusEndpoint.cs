using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using Microsoft.EntityFrameworkCore;

namespace DrMirror.Api.Features.Admin.WhatsApp.GetWhatsAppStatus;

public static class GetWhatsAppStatusEndpoint
{
    public static RouteGroupBuilder MapGetWhatsAppStatus(this RouteGroupBuilder group)
    {
        group.MapGet("/status", HandleAsync)
            .WithName("Admin.WhatsApp.Status")
            .WithSummary("Get WhatsApp sidecar connection state and delivery counts.")
            .Produces<WhatsAppStatusDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        AppDbContext db,
        WhatsAppServiceClient service,
        IWhatsAppHealthCache healthCache,
        CancellationToken ct)
    {
        var serviceStatus = await service.GetStatusAsync(ct);
        var counts = await db.WhatsAppOutboxMessages
            .GroupBy(m => m.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var sent = counts.FirstOrDefault(c => c.Status == WhatsAppOutboxStatus.Sent)?.Count ?? 0;
        var failed = counts.FirstOrDefault(c => c.Status == WhatsAppOutboxStatus.Failed)?.Count ?? 0;
        var skipped = counts.FirstOrDefault(c => c.Status == WhatsAppOutboxStatus.Skipped)?.Count ?? 0;
        var retrying = counts.FirstOrDefault(c => c.Status == WhatsAppOutboxStatus.Retrying)?.Count ?? 0;
        var state = serviceStatus?.State ?? "disconnected";

        var healthResult = healthCache.Latest;
        var sidecarHealth = healthResult is not null
            ? new SidecarHealthDto(healthResult.IsHealthy, healthResult.LastCheckedAt, healthResult.ErrorMessage)
            : null;

        return Results.Ok(new WhatsAppStatusDto(
            ConnectionState: state,
            QrRequired: state == "qr_required" || serviceStatus?.QrAvailable == true,
            LastSentAt: serviceStatus?.LastSentAt,
            LastError: serviceStatus?.Error,
            Counts: new WhatsAppStatusCountsDto(sent, failed, skipped, retrying),
            SidecarHealth: sidecarHealth));
    }
}

public sealed record WhatsAppStatusDto(
    string ConnectionState,
    bool QrRequired,
    DateTimeOffset? LastSentAt,
    string? LastError,
    WhatsAppStatusCountsDto Counts,
    SidecarHealthDto? SidecarHealth);

public sealed record WhatsAppStatusCountsDto(int Sent, int Failed, int Skipped, int Retrying);

public sealed record SidecarHealthDto(bool IsHealthy, DateTimeOffset LastCheckedAt, string? ErrorMessage);
