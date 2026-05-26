using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Shared.Auditing;

namespace DrMirror.Api.Features.Admin.WhatsApp.DisconnectWhatsApp;

public static class DisconnectWhatsAppEndpoint
{
    public static RouteGroupBuilder MapDisconnectWhatsApp(this RouteGroupBuilder group)
    {
        group.MapPost("/disconnect", HandleAsync)
            .WithName("Admin.WhatsApp.Disconnect")
            .WithSummary("Disconnect the active WhatsApp sidecar session.")
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status401Unauthorized)
            .ProducesProblem(StatusCodes.Status403Forbidden)
            .ProducesProblem(StatusCodes.Status502BadGateway);

        return group;
    }

    private static async Task<IResult> HandleAsync(
        WhatsAppServiceClient service,
        IAdminAuditWriter audit,
        AppDbContext db,
        HttpContext http,
        CancellationToken ct)
    {
        try
        {
            await service.DisconnectAsync(ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or InvalidOperationException)
        {
            return Results.Problem(
                title: "WhatsApp disconnect failed",
                detail: "The WhatsApp sidecar could not disconnect the active session.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        await audit.WriteAsync("WhatsApp.Disconnect", "WhatsAppSession", string.Empty, null, null, ct);
        await db.SaveChangesAsync(ct);
        http.Response.Headers.CacheControl = "no-store";
        return Results.NoContent();
    }
}
