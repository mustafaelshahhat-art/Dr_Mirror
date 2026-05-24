namespace DrMirror.Api.Domain.Entities;

public class PasswordResetRequest
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }

    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public bool IsUsed { get; set; }

    public bool IsSuperSeded { get; set; }
}
