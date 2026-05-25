using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DrMirror.Api.Domain.Entities;
using Microsoft.Extensions.Options;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed class WhatsAppServiceClient : IWhatsAppSender
{
    private readonly HttpClient _http;
    private readonly WhatsAppOptions _options;
    private readonly ILogger<WhatsAppServiceClient> _logger;

    public WhatsAppServiceClient(HttpClient http, IOptions<WhatsAppOptions> options, ILogger<WhatsAppServiceClient> logger)
    {
        _http = http;
        _options = options.Value;
        _logger = logger;
    }

    public async Task SendAsync(string phone, string body, WhatsAppMessagePriority priority, CancellationToken ct)
    {
        if (!_options.Enabled)
        {
            throw new InvalidOperationException("whatsapp_disabled");
        }

        var masked = MaskPhone(phone);
        _logger.LogInformation("WhatsApp send starting for phone={MaskedPhone}, Priority={Priority}", masked, priority);
        var sw = Stopwatch.StartNew();

        using var request = new HttpRequestMessage(HttpMethod.Post, "/send-message")
        {
            Content = JsonContent.Create(new { phone, message = body, priority = priority.ToString().ToLowerInvariant() }),
        };
        ApplyInternalApiKey(request);

        using var response = await _http.SendAsync(request, ct);
        sw.Stop();

        if (response.StatusCode == HttpStatusCode.ServiceUnavailable)
        {
            _logger.LogWarning("WhatsApp service unavailable after {ElapsedMs}ms for phone={MaskedPhone}, Priority={Priority}", sw.ElapsedMilliseconds, masked, priority);
            throw new InvalidOperationException("whatsapp_service_unavailable");
        }

        response.EnsureSuccessStatusCode();
        _logger.LogInformation("WhatsApp send completed in {ElapsedMs}ms for phone={MaskedPhone}, Priority={Priority}", sw.ElapsedMilliseconds, masked, priority);
    }

    private static string MaskPhone(string phone)
    {
        if (phone.Length <= 4) return "****";
        return string.Concat(new string('*', phone.Length - 4), phone.AsSpan(phone.Length - 4));
    }

    public async Task<WhatsAppServiceStatusDto?> GetStatusAsync(CancellationToken ct)
    {
        if (!_options.Enabled) return new WhatsAppServiceStatusDto("disabled", false, null, null);

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/status");
            ApplyInternalApiKey(request);
            using var response = await _http.SendAsync(request, ct);
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<WhatsAppServiceStatusDto>(cancellationToken: ct);
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
            using var response = await _http.SendAsync(request, ct);
            if (response.StatusCode == HttpStatusCode.Conflict)
            {
                return new WhatsAppServiceQrDto(null, "already_connected");
            }
            if (!response.IsSuccessStatusCode) return null;
            return await response.Content.ReadFromJsonAsync<WhatsAppServiceQrDto>(cancellationToken: ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            return null;
        }
    }

    public async Task<bool> HealthAsync(CancellationToken ct)
    {
        if (!_options.Enabled) return false;

        try
        {
                using var response = await _http.GetAsync("/ready", ct);
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
