using Microsoft.AspNetCore.Authorization;
using DrMirror.Api.Features.Admin.Audit;
using DrMirror.Api.Features.Admin.Catalog.Categories;
using DrMirror.Api.Features.Admin.Catalog.Products;
using DrMirror.Api.Features.Admin.Orders.GetOrderByNumber;
using DrMirror.Api.Features.Admin.Orders.ListOrders;
using DrMirror.Api.Features.Admin.Orders.ReviewPaymentProof;
using DrMirror.Api.Features.Admin.Orders.Returns;
using DrMirror.Api.Features.Admin.Orders.TransitionOrder;
using DrMirror.Api.Features.Admin.Inquiries;
using DrMirror.Api.Features.Admin.Payments;
using DrMirror.Api.Features.Admin.Shipping;
using DrMirror.Api.Features.Admin.Users;
using DrMirror.Api.Features.Admin.WhatsApp.GetWhatsAppAttempts;
using DrMirror.Api.Features.Admin.WhatsApp.GetWhatsAppQr;
using DrMirror.Api.Features.Admin.WhatsApp.GetWhatsAppStatus;
using DrMirror.Api.Features.Admin.WhatsApp.DisconnectWhatsApp;
using DrMirror.Api.Features.Admin.WhatsApp.RetryAllFailedWhatsApp;
using DrMirror.Api.Features.Admin.WhatsApp.RetryWhatsAppAttempt;
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
    /// <remarks>
    /// <b>Defense-in-depth:</b> The group-level <c>RequireAuthorization</c> with
    /// <c>Roles = Admin</c> is the primary gate. Individual endpoints may add
    /// further authorization policies, but must never relax the Admin requirement.
    /// The rate limiter (<c>RateLimitPolicies.AdminApi</c>) provides a secondary
    /// layer that limits blast radius even with a compromised token.
    /// New admin endpoints must be registered inside this method so they inherit
    /// the group-level role + rate-limit protections automatically.
    /// </remarks>
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
        orders.MapAdminReturns();

        var categories = admin.MapGroup("/categories").WithTags("Admin: Catalog");
        categories.MapAdminCategories();

        var products = admin.MapGroup("/products").WithTags("Admin: Catalog");
        products.MapAdminProducts();
        products.MapAdminVariants();
        products.MapAdminProductImages();

        var inquiries = admin.MapGroup("/inquiries").WithTags("Admin: Inquiries");
        inquiries.MapListInquiries();
        inquiries.MapMarkInquiryRead();
        inquiries.MapMarkInquiryResponded();

        var paymentMethods = admin.MapGroup("/payment-methods").WithTags("Admin: Payments");
        paymentMethods.MapAdminPaymentMethods();

        var shipping = admin.MapGroup("/shipping").WithTags("Admin: Shipping");
        shipping.MapAdminShipping();

        var users = admin.MapGroup("/users").WithTags("Admin: Users");
        users.MapListUsers();
        users.MapUpdateUserRoles();
        users.MapUserStatus();

        var audit = admin.MapGroup("/audit").WithTags("Admin: Audit");
        audit.MapAuditEndpoints();

        var whatsapp = admin.MapGroup("/whatsapp").WithTags("Admin: WhatsApp");
        whatsapp.MapGetWhatsAppStatus();
        whatsapp.MapGetWhatsAppAttempts();
        whatsapp.MapGetWhatsAppQr();
        whatsapp.MapDisconnectWhatsApp();
        whatsapp.MapRetryWhatsAppAttempt();
        whatsapp.MapRetryAllFailedWhatsApp();

        return app;
    }
}
