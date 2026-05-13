using DrMirror.Api.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace DrMirror.Tests.Identity;

/// <summary>
/// Smoke tests for ASP.NET Identity's PasswordHasher against our User type.
/// We do not implement the hasher ourselves — these tests catch regressions
/// where the User entity is changed in a way that breaks the contract
/// (e.g. accidentally removing the empty constructor).
/// </summary>
public class PasswordHasherTests
{
    private static readonly PasswordHasher<User> Hasher = new();

    [Fact]
    public void RoundTrip_succeeds_for_correct_password()
    {
        var user = new User { Email = "x@y.z", UserName = "x@y.z", FullName = "x" };
        var hash = Hasher.HashPassword(user, "Correct-Horse-Battery-Staple-1");

        var result = Hasher.VerifyHashedPassword(user, hash, "Correct-Horse-Battery-Staple-1");

        Assert.Equal(PasswordVerificationResult.Success, result);
    }

    [Fact]
    public void RoundTrip_fails_for_wrong_password()
    {
        var user = new User { Email = "x@y.z", UserName = "x@y.z", FullName = "x" };
        var hash = Hasher.HashPassword(user, "Correct-Horse-Battery-Staple-1");

        var result = Hasher.VerifyHashedPassword(user, hash, "Different-Password-2");

        Assert.Equal(PasswordVerificationResult.Failed, result);
    }

    [Fact]
    public void Same_password_hashed_twice_produces_different_hashes()
    {
        // Identity v3 uses per-hash salt → identical inputs must produce distinct hashes.
        var user = new User { Email = "x@y.z", UserName = "x@y.z", FullName = "x" };
        var hash1 = Hasher.HashPassword(user, "same-input");
        var hash2 = Hasher.HashPassword(user, "same-input");

        Assert.NotEqual(hash1, hash2);
    }
}
