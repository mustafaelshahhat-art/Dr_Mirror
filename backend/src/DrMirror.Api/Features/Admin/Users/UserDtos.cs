using DrMirror.Api.Domain.Entities;
using FluentValidation;

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

// ── Requests ───────────────────────────────────────────────────────────────

public sealed record UpdateUserRolesRequest(string[] Roles);

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

// ── Validator ──────────────────────────────────────────────────────────────

public sealed class UpdateUserRolesValidator : AbstractValidator<UpdateUserRolesRequest>
{
    private static readonly HashSet<string> ValidRoles =
        new(DrMirror.Api.Domain.Identity.UserRoles.All, StringComparer.OrdinalIgnoreCase);

    public UpdateUserRolesValidator()
    {
        RuleFor(r => r.Roles)
            .NotNull()
            .WithMessage("Roles array is required.");

        RuleForEach(r => r.Roles)
            .Must(role => ValidRoles.Contains(role))
            .WithMessage($"Each role must be one of: {string.Join(", ", DrMirror.Api.Domain.Identity.UserRoles.All)}.");
    }
}
