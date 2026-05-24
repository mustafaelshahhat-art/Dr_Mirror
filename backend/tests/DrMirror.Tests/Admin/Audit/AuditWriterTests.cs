using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using DrMirror.Api.Domain.Catalog;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Admin.Audit;

[Collection(IntegrationTestCollection.Name)]
public class AuditWriterTests : IClassFixture<AuditWriterTests.Factory>
{
    private readonly Factory _factory;

    public AuditWriterTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Order_and_payment_proof_admin_mutations_write_audit_rows()
    {
        var actor = await _factory.CreateUserAsync("audit-orders-admin@example.com", UserRoles.Admin);
        var buyer = await _factory.CreateUserAsync("audit-orders-buyer@example.com", UserRoles.Buyer);
        var client = MakeAdminClient(actor.Id);

        var transitionOrder = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Cod, OrderStatus.Confirmed);
        var cancelOrder = await _factory.SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay, OrderStatus.Pending);
        var approveProof = await _factory.SeedOrderWithProofAsync(buyer.Id);
        var rejectProof = await _factory.SeedOrderWithProofAsync(buyer.Id);

        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{transitionOrder}/transition", new
        {
            toStatus = "Preparing",
            reason = "Prepare order",
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{cancelOrder}/transition", new
        {
            toStatus = "Cancelled",
            reason = "Customer requested cancellation",
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{approveProof.OrderNumber}/proof/{approveProof.ProofId}/approve", new
        {
            reviewNote = "Matched transfer",
        }));
        await AssertOkAsync(client.PostAsJsonAsync($"/api/admin/orders/{rejectProof.OrderNumber}/proof/{rejectProof.ProofId}/reject", new
        {
            reviewNote = "Unreadable proof",
        }));

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        AssertAudit(db, actor.Id, "Order.StatusChange", "Confirmed", "Preparing");
        AssertAudit(db, actor.Id, "Order.Cancel", "Pending", "Cancelled");
        AssertAudit(db, actor.Id, "PaymentProof.Approve", "Pending", "Approved");
        AssertAudit(db, actor.Id, "PaymentProof.Reject", "Pending", "Rejected");
    }

    [Fact]
    public async Task Catalog_stock_and_role_admin_mutations_write_audit_rows()
    {
        var actor = await _factory.CreateUserAsync("audit-catalog-admin@example.com", UserRoles.Admin);
        var target = await _factory.CreateUserAsync("audit-role-target@example.com", UserRoles.Buyer);
        var client = MakeAdminClient(actor.Id);

        var categoryResponse = await AssertStatusAsync(client.PostAsJsonAsync("/api/admin/categories", new
        {
            nameAr = "تصنيف تدقيق",
            nameEn = $"Audit Category {Guid.NewGuid():N}",
            displayOrder = 1,
        }), HttpStatusCode.Created);
        var categoryId = await ReadGuidAsync(categoryResponse, "id");

        await AssertOkAsync(client.PutAsJsonAsync($"/api/admin/categories/{categoryId}", new
        {
            nameAr = "تصنيف تدقيق محدث",
            nameEn = "Audit Category Updated",
            displayOrder = 2,
        }));

        var productResponse = await AssertStatusAsync(client.PostAsJsonAsync("/api/admin/products", new
        {
            nameAr = "منتج تدقيق",
            nameEn = $"Audit Product {Guid.NewGuid():N}",
            descriptionAr = "وصف",
            descriptionEn = "Description",
            price = 123.45m,
            gender = "Unisex",
            material = "Cotton",
            brand = "Dr Mirror",
            sku = $"AUD-{Guid.NewGuid():N}"[..18],
            categoryId,
        }), HttpStatusCode.Created);
        var productBody = await productResponse.Content.ReadAsStringAsync();
        using var productDoc = JsonDocument.Parse(productBody);
        var productId = productDoc.RootElement.GetProperty("id").GetGuid();
        var currentRowVersion = productDoc.RootElement.TryGetProperty("rowVersion", out var rvProp)
            ? rvProp.GetString()
            : null;

        await AssertOkAsync(client.PutAsJsonAsync($"/api/admin/products/{productId}", new
        {
            nameAr = "منتج تدقيق محدث",
            nameEn = "Audit Product Updated",
            descriptionAr = "وصف محدث",
            descriptionEn = "Updated description",
            price = 150m,
            gender = "Unisex",
            material = "Cotton",
            brand = "Dr Mirror",
            sku = $"AUDU-{Guid.NewGuid():N}"[..18],
            categoryId,
            rowVersion = string.IsNullOrEmpty(currentRowVersion) ? (string?)null : currentRowVersion,
        }));

        var variantResponse = await AssertStatusAsync(client.PostAsJsonAsync($"/api/admin/products/{productId}/variants", new
        {
            size = "M",
            colorName = "Navy",
            colorNameAr = "كحلي",
            colorHex = "#001F3F",
            sku = $"VAR-{Guid.NewGuid():N}"[..18],
            stock = 5,
        }), HttpStatusCode.Created);
        var variantId = await ReadGuidAsync(variantResponse, "id");

        await AssertOkAsync(client.PutAsJsonAsync($"/api/admin/products/{productId}/variants/{variantId}", new
        {
            size = "M",
            colorName = "Navy",
            colorNameAr = "كحلي",
            colorHex = "#001F3F",
            sku = $"VARU-{Guid.NewGuid():N}"[..18],
            stock = 9,
        }));

        await AssertOkAsync(client.PutAsJsonAsync($"/api/admin/users/{target.Id}/roles", new
        {
            roles = new[] { UserRoles.Buyer, UserRoles.Vendor },
        }));

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        AssertAudit(db, actor.Id, "Category.Create", null, "Active");
        AssertAudit(db, actor.Id, "Category.Update");
        AssertAudit(db, actor.Id, "Product.Create", null, "Draft");
        AssertAudit(db, actor.Id, "Product.Update");
        AssertAudit(db, actor.Id, "Stock.Adjust", null, "5");
        AssertAudit(db, actor.Id, "Stock.Adjust", "5", "9");
        AssertAudit(db, actor.Id, "User.RoleChange", "Buyer", "Buyer,Vendor");
    }

    private HttpClient MakeAdminClient(Guid actorId)
    {
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddAuthentication("TestAuth")
                    .AddScheme<AuthenticationSchemeOptions, AuditTestAuthHandler>("TestAuth", _ => { });
                services.AddSingleton(new AuditTestCaller(actorId));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    private static async Task<HttpResponseMessage> AssertStatusAsync(Task<HttpResponseMessage> request, HttpStatusCode statusCode)
    {
        var response = await request;
        Assert.True(response.StatusCode == statusCode,
            $"Expected {(int)statusCode}, got {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
        return response;
    }

    private static async Task AssertOkAsync(Task<HttpResponseMessage> request) =>
        await AssertStatusAsync(request, HttpStatusCode.OK);

    private static async Task<Guid> ReadGuidAsync(HttpResponseMessage response, string propertyName)
    {
        var body = await response.Content.ReadAsStringAsync();
        using var document = JsonDocument.Parse(body);
        return document.RootElement.GetProperty(propertyName).GetGuid();
    }

    private static void AssertAudit(
        AppDbContext db,
        Guid actorId,
        string actionType,
        string? previousStatus = null,
        string? newStatus = null)
    {
        Assert.Contains(db.AdminAuditLogEntries, entry =>
            entry.ActorUserId == actorId
            && entry.ActionType == actionType
            && entry.PreviousStatus == previousStatus
            && entry.NewStatus == newStatus
            && !string.IsNullOrWhiteSpace(entry.TargetEntityType)
            && !string.IsNullOrWhiteSpace(entry.TargetEntityId)
            && !string.IsNullOrWhiteSpace(entry.CorrelationId));
    }

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "AuditWriterTests_" + Guid.NewGuid();

        public async Task<User> CreateUserAsync(string email, string role)
        {
            await using var scope = Services.CreateAsyncScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

            foreach (var knownRole in UserRoles.All)
            {
                if (!await roleManager.RoleExistsAsync(knownRole))
                {
                    var roleResult = await roleManager.CreateAsync(new IdentityRole<Guid>(knownRole));
                    Assert.True(roleResult.Succeeded, string.Join("; ", roleResult.Errors.Select(e => e.Description)));
                }
            }

            var user = new User
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                FullName = email,
                EmailConfirmed = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            var createResult = await userManager.CreateAsync(user, "Password123!");
            Assert.True(createResult.Succeeded, string.Join("; ", createResult.Errors.Select(e => e.Description)));
            var roleResult2 = await userManager.AddToRoleAsync(user, role);
            Assert.True(roleResult2.Succeeded, string.Join("; ", roleResult2.Errors.Select(e => e.Description)));
            return user;
        }

        public async Task<string> SeedOrderAsync(Guid buyerId, PaymentMethodKind kind, OrderStatus status)
        {
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var paymentMethod = new PaymentMethod
            {
                Id = Guid.NewGuid(),
                NameEn = $"Audit {kind}",
                NameAr = $"Audit {kind}",
                Kind = kind,
                IsActive = true,
            };
            db.PaymentMethods.Add(paymentMethod);

            var orderNumber = $"DM-AUD-{Guid.NewGuid():N}"[..20];
            db.Orders.Add(new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = orderNumber,
                BuyerUserId = buyerId,
                Status = status,
                SubTotal = 100,
                ShippingFee = 0,
                Total = 100,
                Currency = "EGP",
                PaymentMethodId = paymentMethod.Id,
                PaymentMethodKind = kind,
                PaymentMethodNameEn = paymentMethod.NameEn,
                PaymentMethodNameAr = paymentMethod.NameAr,
                ShippingAddress = new ShippingAddress
                {
                    RecipientName = "Audit Buyer",
                    Phone = "01000000000",
                    Governorate = "cairo",
                    City = "Maadi",
                    StreetAddress = "123 Street",
                },
            });

            await db.SaveChangesAsync();
            return orderNumber;
        }

        public async Task<(string OrderNumber, Guid ProofId)> SeedOrderWithProofAsync(Guid buyerId)
        {
            var orderNumber = await SeedOrderAsync(buyerId, PaymentMethodKind.Instapay, OrderStatus.PendingPaymentReview);
            await using var scope = Services.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var order = db.Orders.Single(o => o.OrderNumber == orderNumber);
            var proofId = Guid.NewGuid();
            db.PaymentProofs.Add(new PaymentProof
            {
                Id = proofId,
                OrderId = order.Id,
                FileUrl = "/uploads/payment-proofs/audit.jpg",
                FileKey = "payment-proofs/audit.jpg",
                ContentType = "image/jpeg",
                SizeBytes = 6,
                Status = PaymentProofStatus.Pending,
                UploadedAt = DateTimeOffset.UtcNow,
            });
            await db.SaveChangesAsync();
            return (orderNumber, proofId);
        }
    }
}

public sealed class AuditTestCaller
{
    public Guid UserId { get; }

    public AuditTestCaller(Guid userId)
    {
        UserId = userId;
    }
}

public sealed class AuditTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly AuditTestCaller _caller;

    public AuditTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        AuditTestCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _caller.UserId.ToString()),
            new Claim(JwtRegisteredClaimNames.Sub, _caller.UserId.ToString()),
            new Claim(ClaimTypes.Role, UserRoles.Admin),
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
