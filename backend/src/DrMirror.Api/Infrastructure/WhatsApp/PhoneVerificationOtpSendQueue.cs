using System.Threading.Channels;
using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Infrastructure.WhatsApp;

public sealed record PhoneVerificationOtpSendJob(
    Guid SessionId,
    Guid UserId,
    OtpPurpose Purpose,
    string PhoneE164,
    string MaskedPhone,
    string Body);

public interface IPhoneVerificationOtpSendQueue
{
    ValueTask EnqueueAsync(PhoneVerificationOtpSendJob job, CancellationToken ct);
    IAsyncEnumerable<PhoneVerificationOtpSendJob> ReadAllAsync(CancellationToken ct);
}

public sealed class PhoneVerificationOtpSendQueue : IPhoneVerificationOtpSendQueue
{
    private readonly Channel<PhoneVerificationOtpSendJob> _channel = Channel.CreateUnbounded<PhoneVerificationOtpSendJob>(
        new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false,
        });

    public ValueTask EnqueueAsync(PhoneVerificationOtpSendJob job, CancellationToken ct) =>
        _channel.Writer.WriteAsync(job, ct);

    public IAsyncEnumerable<PhoneVerificationOtpSendJob> ReadAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);
}
