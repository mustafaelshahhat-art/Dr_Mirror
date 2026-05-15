using Microsoft.AspNetCore.Authorization;
using DrMirror.Api.Features.Admin.Catalog.Categories;
using DrMirror.Api.Features.Admin.Catalog.Products;
using DrMirror.Api.Features.Admin.Orders.GetOrderByNumber;
using DrMirror.Api.Features.Admin.Orders.ListOrders;
using DrMirror.Api.Features.Admin.Orders.ReviewPaymentProof;
using DrMirror.Api.Features.Admin.Orders.TransitionOrder;
using DrMirror.Api.Features.Admin.Inquiries;
using DrMirror.Api.Features.Admin.Payments;
using DrMirror.Api.Features.Admin.Users;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Shared.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace DrMirror.Api.Features.Admin;

public static class AdminEndpoints
{
    /// <summary>
    /// Mounts every staff-only slice. Each endpoint applies its own
    /// <c>RequireRole(Admin)</c> on top of the JWT authentication.
    /// A conservative rate-limit (120 req/min per user) is applied to the group.
    /// </summary>
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var admin = app.MapGroup("/api/admin")
            .RequireRateLimiting(RateLimitPolicies.AdminApi)
            .RequireAuthorization(new AuthorizeAttribute { Roles = UserRoles.Admin });

        var orders = admin.MapGroup("/orders").WithTags("Admin: Orders");
        orders.MapListOrders();
        orders.MapOrderStats();
        orders.MapAdminGetOrderByNumber();
        orders.MapTransitionOrder();
        orders.MapApprovePaymentProof();
        orders.MapRejectPaymentProof();

        var categories = admin.MapGroup("/categories").WithTags("Admin: Catalog");
        categories.MapAdminCategories();

        var products = admin.MapGroup("/products").WithTags("Admin: Catalog");
        products.MapAdminProducts();
        products.MapAdminVariants();
        products.MapAdminProductImages();

        var inquiries = admin.MapGroup("/inquiries").WithTags("Admin: Inquiries");
        inquiries.MapListInquiries();
        inquiries.MapMarkInquiryRead();

        var paymentMethods = admin.MapGroup("/payment-methods").WithTags("Admin: Payments");
        paymentMethods.MapAdminPaymentMethods();

        var users = admin.MapGroup("/users").WithTags("Admin: Users");
        users.MapListUsers();
        users.MapUpdateUserRoles();

        return app;
    }
}
