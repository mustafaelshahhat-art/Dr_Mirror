using DrMirror.Api.Features.Admin.Orders.Returns.GetAdminReturn;
using DrMirror.Api.Features.Admin.Orders.Returns.ListAdminReturns;
using DrMirror.Api.Features.Admin.Orders.Returns.TransitionReturn;

namespace DrMirror.Api.Features.Admin.Orders.Returns;

public static class AdminReturnsEndpointExtensions
{
    public static RouteGroupBuilder MapAdminReturns(this RouteGroupBuilder group)
    {
        group.MapListAdminReturns();
        group.MapGetAdminReturn();
        group.MapTransitionReturn();

        return group;
    }
}
