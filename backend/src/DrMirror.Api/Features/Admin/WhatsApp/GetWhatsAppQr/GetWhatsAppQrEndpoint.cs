using DrMirror.Api.Infrastructure.WhatsApp;

namespace DrMirror.Api.Features.Admin.WhatsApp.GetWhatsAppQr;

public static class GetWhatsAppQrEndpoint
{
    public static RouteGroupBuilder MapGetWhatsAppQr(this RouteGroupBuilder group)
    {
        group.MapGet("/qr", HandleAsync)
            .WithName("Admin.WhatsApp.Qr")
            .WithSummary("Get the latest WhatsApp pairing QR code.")
            .Produces<WhatsAppQrDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status503ServiceUnavailable);

        return group;
    }

    private static async Task<IResult> HandleAsync(WhatsAppServiceClient service, CancellationToken ct)
    {
        var status = await service.GetStatusAsync(ct);
        if (status is null)
        {
            return Results.Json(new { error = "sidecar_unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        if (status.State == "connected")
        {
            return Results.Json(new { error = "already_connected" }, statusCode: StatusCodes.Status409Conflict);
        }

        var qr = await service.GetQrAsync(ct);
        if (qr is null)
        {
            return Results.Json(new { error = "service_unavailable" }, statusCode: StatusCodes.Status503ServiceUnavailable);
        }

        if (qr.Error == "already_connected")
        {
            return Results.Json(new { error = "already_connected" }, statusCode: StatusCodes.Status409Conflict);
        }

        return Results.Ok(new WhatsAppQrDto(qr.QrDataUri));
    }
}

public sealed record WhatsAppQrDto(string? QrDataUri);
