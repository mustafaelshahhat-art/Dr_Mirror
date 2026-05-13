using DrMirror.Api.Features.Checkout.CreateOrder;
using DrMirror.Api.Features.Checkout.GetPaymentMethods;

namespace DrMirror.Api.Features.Checkout;

public static class CheckoutEndpoints
{
    /// <summary>
    /// Mounts the buyer-facing checkout slice under <c>/api/checkout</c>.
    /// </summary>
    public static IEndpointRouteBuilder MapCheckoutEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/checkout").WithTags("Checkout");

        group.MapGetPaymentMethods();
        group.MapCreateOrder();

        return app;
    }
}
