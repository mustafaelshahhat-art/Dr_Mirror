namespace DrMirror.Api.Features.Auth.Profile;

public sealed record GetProfileResponse(
    string FullName,
    string Email,
    string? PhoneNumber,
    bool PhoneVerified,
    DateTimeOffset? PhoneVerifiedAt);

public sealed record PatchProfileRequest(string? FullName, string? PhoneNumber);
