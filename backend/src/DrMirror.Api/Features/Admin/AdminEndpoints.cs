using DrMirror.Api.Features.Admin.Catalog.Categories;
using DrMirror.Api.Features.Admin.Catalog.Products;
using DrMirror.Api.Features.Admin.Orders.GetOrderByNumber;
using DrMirror.Api.Features.Admin.Orders.ListOrders;
using DrMirror.Api.Features.Admin.Orders.ReviewPaymentProof;
using DrMirror.Api.Features.Admin.Orders.TransitionOrder;
using DrMirror.Api.Features.Admin.Inquiries;
using DrMirror.Api.Features.Admin.Payments;
using DrMirror.Api.Features.Admin.Users;

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

        // M4 admin catalog — categories, products, variants (nested), images (nested).
        var categories = app.MapGroup("/api/admin/categories").WithTags("Admin: Catalog");
        categories.MapAdminCategories();

        var products = app.MapGroup("/api/admin/products").WithTags("Admin: Catalog");
        products.MapAdminProducts();
        products.MapAdminVariants();
        products.MapAdminProductImages();

        // M6 admin inquiries inbox.
        var inquiries = app.MapGroup("/api/admin/inquiries").WithTags("Admin: Inquiries");
        inquiries.MapListInquiries();
        inquiries.MapMarkInquiryRead();

        // M4 admin payment-method CRUD.
        var paymentMethods = app.MapGroup("/api/admin/payment-methods").WithTags("Admin: Payments");
        paymentMethods.MapAdminPaymentMethods();

        // Admin user management.
        var users = app.MapGroup("/api/admin/users").WithTags("Admin: Users");
        users.MapListUsers();
        users.MapUpdateUserRoles();

        return app;
    }
}
