using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Features.Admin.Users;

namespace DrMirror.Tests.Security;

/// <summary>
/// Verifies role-management guards:
///   • Only known roles are accepted by <see cref="UpdateUserRolesValidator"/>.
///   • The self-de-admin protection logic (tested at the condition level).
///   • Role normalisation: casing is ignored when comparing to valid roles.
/// </summary>
public class UserRoleSecurityTests
{
    private readonly UpdateUserRolesValidator _v = new();

    // ── Validator: only known roles ───────────────────────────────────────

    [Fact]
    public void Known_roles_are_valid()
    {
        var result = _v.Validate(new UpdateUserRolesRequest(Roles: [.. UserRoles.All]));
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Empty_roles_array_is_valid()
    {
        // Admins should be able to strip all roles (subject to self-de-admin guard
        // enforced in the endpoint, not the validator).
        var result = _v.Validate(new UpdateUserRolesRequest(Roles: []));
        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("SuperAdmin")]
    [InlineData("Owner")]
    [InlineData("moderator")]
    [InlineData("")]
    public void Unknown_roles_are_rejected(string badRole)
    {
        var result = _v.Validate(new UpdateUserRolesRequest(Roles: [badRole]));
        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("admin")]
    [InlineData("ADMIN")]
    [InlineData("Admin")]
    [InlineData("buyer")]
    [InlineData("BUYER")]
    [InlineData("vendor")]
    [InlineData("VENDOR")]
    public void Role_lookup_is_case_insensitive(string roleName)
    {
        // The validator uses OrdinalIgnoreCase comparison.
        var result = _v.Validate(new UpdateUserRolesRequest(Roles: [roleName]));
        Assert.True(result.IsValid, $"'{roleName}' should be accepted case-insensitively");
    }

    // ── Self-de-admin guard (endpoint-level logic, tested here as conditions)

    [Fact]
    public void Admin_removing_own_admin_role_is_detected()
    {
        var callerId = Guid.NewGuid();
        var targetUserId = callerId; // same person
        var requestedRoles = new[] { UserRoles.Buyer }; // no Admin in new set

        var isSelfDeAdmin =
            callerId == targetUserId
            && !requestedRoles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase);

        Assert.True(isSelfDeAdmin);
    }

    [Fact]
    public void Promoting_another_user_is_not_self_de_admin()
    {
        var callerId = Guid.NewGuid();
        var targetUserId = Guid.NewGuid(); // different user
        var requestedRoles = new[] { UserRoles.Buyer };

        var isSelfDeAdmin =
            callerId == targetUserId
            && !requestedRoles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase);

        Assert.False(isSelfDeAdmin);
    }

    [Fact]
    public void Admin_keeping_own_admin_role_is_safe()
    {
        var callerId = Guid.NewGuid();
        var targetUserId = callerId;
        var requestedRoles = new[] { UserRoles.Admin, UserRoles.Buyer };

        var isSelfDeAdmin =
            callerId == targetUserId
            && !requestedRoles.Contains(UserRoles.Admin, StringComparer.OrdinalIgnoreCase);

        Assert.False(isSelfDeAdmin);
    }
}
