using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Features.Admin.Users;

// ── Response ───────────────────────────────────────────────────────────────

public sealed record AdminUserDto(
    Guid Id,
    string FullName,
    string Email,
    string? PhoneNumber,
    bool IsDisabled,
    DateTimeOffset CreatedAt,
    string[] Roles);

// ── Mapping ────────────────────────────────────────────────────────────────

public static class UserMapping
{
    public static AdminUserDto ToAdminDto(this User user, IList<string> roles) => new(
        Id: user.Id,
        FullName: user.FullName,
        Email: user.Email ?? string.Empty,
        PhoneNumber: user.PhoneNumber,
        IsDisabled: user.IsDisabled,
        CreatedAt: user.CreatedAt,
        Roles: [.. roles]);
}
