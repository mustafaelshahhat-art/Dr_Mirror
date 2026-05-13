using DrMirror.Api.Features.Admin.Orders.GetOrderByNumber;
using DrMirror.Api.Features.Admin.Orders.ListOrders;
using DrMirror.Api.Features.Admin.Orders.ReviewPaymentProof;
using DrMirror.Api.Features.Admin.Orders.TransitionOrder;

namespace DrMirror.Api.Features.Admin;

public static class AdminEndpoints
{
    /// <summary>
    /// Mounts every staff-only slice. Each endpoint applies its own
    /// <c>RequireRole(Admin)</c> on top of the JWT authentication.
    /// </summary>
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var orders = app.MapGroup("/api/admin/orders").WithTags("Admin: Orders");

        orders.MapListOrders();
        orders.MapAdminGetOrderByNumber();
        orders.MapTransitionOrder();
        orders.MapApprovePaymentProof();
        orders.MapRejectPaymentProof();

        return app;
    }
}
