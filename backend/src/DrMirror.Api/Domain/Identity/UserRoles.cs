namespace DrMirror.Api.Domain.Identity;

/// <summary>
/// Canonical role names. Use these constants in <c>[Authorize(Roles = ...)]</c>
/// and in the <see cref="Microsoft.AspNetCore.Identity.RoleManager{TRole}"/>
/// so we never spell a role string twice.
/// </summary>
/// <remarks>
/// Role list is fixed for the lifetime of the app:
///   - <see cref="Admin"/>   — staff (single seed account at first boot).
///   - <see cref="Vendor"/>  — single approved vendor in M1; multi-vendor lands later.
///   - <see cref="Buyer"/>   — default role on self-signup.
/// </remarks>
public static class UserRoles
{
    public const string Admin = "Admin";
    public const string Vendor = "Vendor";
    public const string Buyer = "Buyer";

    public static readonly IReadOnlyList<string> All = new[] { Admin, Vendor, Buyer };
}
