using DrMirror.Api.Features.Auth.Login;
using DrMirror.Api.Features.Auth.Logout;
using DrMirror.Api.Features.Auth.Me;
using DrMirror.Api.Features.Auth.Refresh;
using DrMirror.Api.Features.Auth.Register;

namespace DrMirror.Api.Features.Auth;

public static class AuthEndpoints
{
    /// <summary>
    /// Mounts the entire auth slice under /api/auth.
    ///   POST /api/auth/register
    ///   POST /api/auth/login
    ///   POST /api/auth/refresh
    ///   POST /api/auth/logout
    ///   GET  /api/auth/me
    ///   PUT  /api/auth/me
    /// </summary>
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapRegister();
        group.MapLogin();
        group.MapRefresh();
        group.MapLogout();
        group.MapMe();

        return app;
    }
}
