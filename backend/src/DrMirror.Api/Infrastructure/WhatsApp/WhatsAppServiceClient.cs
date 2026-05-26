using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppServiceClient : IWhatsAppSender
{
    private const string LogoutPath = "/api/logout";

    private readonly HttpClient _http;
    private readonly WhatsAppOptions _options;

    public WhatsAppServiceClient(HttpClient http, IOptions<WhatsAppOptions> options)
    {
        _http = http;
        _options = options.Value;
    }

    public async Task SendAsync(string phone, string body, CancellationToken ct)
    {
        if (!_options.Enabled)
        {
            throw new InvalidOperationException("whatsapp_disabled");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "/send-message")
        {
            Content = JsonContent.Create(new { phone, message = body }),
        };
        ApplyInternalApiKey(request);

        using var response = await _http.SendAsync(request, ct);
        if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
        {
            throw new InvalidOperationException("whatsapp_service_unavailable");
        }

        response.EnsureSuccessStatusCode();
    }

    public async Task<WhatsAppServiceStatusDto?> GetStatusAsync(CancellationToken ct)
    {
        if (!_options.Enabled) return new WhatsAppServiceStatusDto("disabled", false, null, null);

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/status");
            ApplyInternalApiKey(request);
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
            using var response = await _http.SendAsync(request, cts.Token);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<WhatsAppServiceStatusDto>(cancellationToken: cts.Token);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return null;
        }
    }

    public async Task<WhatsAppServiceQrDto?> GetQrAsync(CancellationToken ct)
    {
        if (!_options.Enabled) return null;

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/qr");
            ApplyInternalApiKey(request);
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
            using var response = await _http.SendAsync(request, cts.Token);
            if (response.StatusCode == HttpStatusCode.Conflict)
            {
                return new WhatsAppServiceQrDto(null, "already_connected");
            }
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<WhatsAppServiceQrDto>(cancellationToken: cts.Token);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return null;
        }
    }

    public async Task DisconnectAsync(CancellationToken ct)
    {
        if (!_options.Enabled)
        {
            throw new InvalidOperationException("whatsapp_disabled");
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, LogoutPath);
        ApplyInternalApiKey(request);
        using var disconnectCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        disconnectCts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
        using var response = await _http.SendAsync(request, disconnectCts.Token);
        response.EnsureSuccessStatusCode();
    }

    public async Task<bool> HealthAsync(CancellationToken ct)
    {
        if (!_options.Enabled) return false;

        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));
            using var response = await _http.GetAsync("/health", cts.Token);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return false;
        }
    }

    private void ApplyInternalApiKey(HttpRequestMessage request)
    {
        if (!string.IsNullOrWhiteSpace(_options.InternalApiKey))
        {
            request.Headers.Add("X-Internal-Api-Key", _options.InternalApiKey);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.InternalApiKey);
        }
    }

    public sealed record WhatsAppServiceStatusDto(string State, bool QrAvailable, DateTimeOffset? LastSentAt, string? Error);
    public sealed record WhatsAppServiceQrDto(string? QrDataUri, string? Error = null);
}
