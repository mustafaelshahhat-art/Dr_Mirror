using DrMirror.Api.Domain.Entities;

namespace DrMirror.Api.Features.Auth.Common;

internal static class UserDtoMapper
{
    public static UserDto ToDto(User user, IList<string> roles) => new(
        Id: user.Id,
        Email: user.Email ?? string.Empty,
        FullName: user.FullName,
        Phone: user.PhoneNumber,
        PhoneNumberConfirmed: user.PhoneNumberConfirmed,
        Roles: roles.ToArray(),
        CreatedAt: user.CreatedAt);
}
