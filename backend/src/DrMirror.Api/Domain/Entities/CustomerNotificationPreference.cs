namespace DrMirror.Api.Domain.Entities;

public class CustomerNotificationPreference
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User? User { get; set; }
    public bool WhatsAppEnabled { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
