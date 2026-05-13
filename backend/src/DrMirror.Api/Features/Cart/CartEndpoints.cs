using DrMirror.Api.Features.Cart.AddCartItem;
using DrMirror.Api.Features.Cart.ClearCart;
using DrMirror.Api.Features.Cart.GetMyCart;
using DrMirror.Api.Features.Cart.MergeCart;
using DrMirror.Api.Features.Cart.RemoveCartItem;
using DrMirror.Api.Features.Cart.UpdateCartItem;

namespace DrMirror.Api.Features.Cart;

public static class CartEndpoints
{
    /// <summary>
    /// Mounts the buyer cart slice under <c>/api/cart</c>. Every endpoint
    /// requires a signed-in user — guest carts live in localStorage on the
    /// client until the buyer signs in and POSTs them to /merge.
    /// </summary>
    public static IEndpointRouteBuilder MapCartEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/cart").WithTags("Cart");

        group.MapGetMyCart();
        group.MapAddCartItem();
        group.MapUpdateCartItem();
        group.MapRemoveCartItem();
        group.MapClearCart();
        group.MapMergeCart();

        return app;
    }
}
