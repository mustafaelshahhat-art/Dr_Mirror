namespace DrMirror.Api.Features.Auth.Common;

/// <summary>
/// Public projection of <see cref="Domain.Entities.User"/>. The /me endpoint
/// and every login/register response include exactly this shape — nothing
/// more, nothing less — so the frontend has a single user contract.
/// </summary>
public sealed record UserDto(
    Guid Id,
    string Email,
    string FullName,
    string? Phone,
    bool PhoneNumberConfirmed,
    IReadOnlyList<string> Roles,
    DateTimeOffset CreatedAt);

/// <summary>
/// Body returned by /register, /login, and /refresh. The refresh token rides
/// in an httpOnly cookie — never in the JSON body — so the SPA can't read it.
/// </summary>
public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    UserDto User);
