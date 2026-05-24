using DrMirror.Api.Features.Orders.CancelMyOrder;
using DrMirror.Api.Features.Orders.GetMyOrderByNumber;
using DrMirror.Api.Features.Orders.GetMyOrders;
using DrMirror.Api.Features.Orders.GetPaymentProofFile;
using DrMirror.Api.Features.Orders.Returns.CancelMyReturn;
using DrMirror.Api.Features.Orders.Returns.GetMyReturns;
using DrMirror.Api.Features.Orders.Returns.SubmitReturn;
using DrMirror.Api.Features.Orders.UploadPaymentProof;

namespace DrMirror.Api.Features.Orders;

public static class OrderEndpoints
{
    /// <summary>
    /// Mounts the buyer-facing orders slice under <c>/api/orders</c>. Admin
    /// equivalents live under <c>/api/admin/orders</c> in the Admin slice.
    /// </summary>
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders").WithTags("Orders");

        group.MapGetMyOrders();
        group.MapGetMyOrderByNumber();
        group.MapCancelMyOrder();
        group.MapSubmitReturn();
        group.MapGetMyReturns();
        group.MapCancelMyReturn();
        group.MapUploadPaymentProof();
        group.MapGetPaymentProofFile();

        return app;
    }
}
