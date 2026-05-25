using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using DrMirror.Api.Features.Auth.PhoneVerification;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.WhatsApp;
using DrMirror.Api.Domain.Entities;
using DrMirror.Tests.Infrastructure;
using DrMirror.Tests.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace DrMirror.Tests.Identity;

[Collection(IntegrationTestCollection.Name)]
public class PhoneVerificationOtpTests : IClassFixture<PhoneVerificationOtpTests.Factory>
{
    private readonly Factory _factory;

    public PhoneVerificationOtpTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Send_returns_session_before_whatsapp_send_completes_and_exposes_status()
    {
        var user = await _factory.CreateUserAsync($"otp-fast-{Guid.NewGuid():N}@example.com");
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var current = await db.Users.SingleAsync(u => u.Id == user.Id);
            current.PhoneNumberConfirmed = false;
            current.PhoneVerifiedAt = null;
            await db.SaveChangesAsync();
        }

        var token = await _factory.IssueAccessTokenAsync(user.Id, "Buyer");
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var response = await client.PostAsJsonAsync("/api/account/phone/verify/send", new { purpose = "profile" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SendOtpResponse>();
        Assert.NotNull(body);
        Assert.Equal("sending", body!.Status);

        var status = await client.GetFromJsonAsync<OtpSendStatusResponse>($"/api/account/phone/verify/send-status/{body.SessionId}");
        Assert.NotNull(status);
        Assert.True(status!.Status is "sending" or "sent");
        _factory.Sender.Release();
    }

    [Fact]
    public async Task Verify_accepts_earlier_code_when_duplicate_sends_arrive_out_of_order()
    {
        var user = await _factory.CreateUserAsync($"otp-{Guid.NewGuid():N}@example.com");
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var current = await db.Users.SingleAsync(u => u.Id == user.Id);
            current.PhoneNumberConfirmed = false;
            current.PhoneVerifiedAt = null;
            await db.SaveChangesAsync();
        }

        var token = await _factory.IssueAccessTokenAsync(user.Id, "Buyer");
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var previousSendCount = _factory.Sender.SentCodes.Count;

        var firstSend = client.PostAsJsonAsync("/api/account/phone/verify/send", new { purpose = "profile" });
        var secondSend = client.PostAsJsonAsync("/api/account/phone/verify/send", new { purpose = "profile" });
        var sendResponses = await Task.WhenAll(firstSend, secondSend);

        Assert.All(sendResponses, response => Assert.Equal(HttpStatusCode.OK, response.StatusCode));
        await _factory.Sender.WaitForSendsAsync(previousSendCount + 2, TimeSpan.FromSeconds(5));

        var verifyResponse = await client.PostAsJsonAsync("/api/account/phone/verify", new
        {
            purpose = "profile",
            code = _factory.Sender.SentCodes[previousSendCount],
        });

        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        await using var verifyScope = _factory.Services.CreateAsyncScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var verifiedUser = await verifyDb.Users.SingleAsync(u => u.Id == user.Id);
        Assert.True(verifiedUser.PhoneNumberConfirmed);
        Assert.NotNull(verifiedUser.PhoneVerifiedAt);
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "PhoneVerificationOtpTests_" + Guid.NewGuid();
        public CapturingWhatsAppSender Sender { get; } = new();

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.RemoveAll<IWhatsAppSender>();
            services.AddSingleton<IWhatsAppSender>(Sender);
        }
    }

    public sealed class CapturingWhatsAppSender : IWhatsAppSender
    {
        private static readonly Regex OtpRegex = new(@"\d{6}", RegexOptions.Compiled);
        private readonly object _gate = new();
        private readonly TaskCompletionSource _release = new(TaskCreationOptions.RunContinuationsAsynchronously);
        private int _sendCount;

        public List<string> SentCodes { get; } = [];

        public async Task WaitForSendsAsync(int count, TimeSpan timeout)
        {
            using var cts = new CancellationTokenSource(timeout);
            while (!cts.IsCancellationRequested)
            {
                lock (_gate)
                {
                    if (SentCodes.Count >= count) return;
                }

                await Task.Delay(25, cts.Token);
            }

            Assert.Fail($"Timed out waiting for {count} OTP sends.");
        }

        public void Release() => _release.TrySetResult();

        public async Task SendAsync(string phone, string body, WhatsAppMessagePriority priority, CancellationToken ct)
        {
            Assert.Equal(WhatsAppMessagePriority.High, priority);
            var match = OtpRegex.Match(body);
            Assert.True(match.Success, body);

            lock (_gate)
            {
                SentCodes.Add(match.Value);
                _sendCount++;
                if (_sendCount >= 2)
                {
                    _release.TrySetResult();
                }
            }

            await _release.Task.WaitAsync(ct);
        }
    }
}
