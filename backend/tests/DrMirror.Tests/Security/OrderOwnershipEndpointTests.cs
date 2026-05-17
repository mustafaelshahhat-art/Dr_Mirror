using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Features.Orders.Common;
using DrMirror.Api.Infrastructure.Identity;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Api.Infrastructure.Storage;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace DrMirror.Tests.Security;

/// <summary>
/// Endpoint-level integration tests verifying authorization boundaries
/// through the real HTTP pipeline, routing, and JWT authentication.
/// </summary>
[Collection(IntegrationTestCollection.Name)]
public class OrderOwnershipEndpointTests : IClassFixture<OrderOwnershipEndpointTests.Factory>
{
    private readonly Factory _factory;

    public OrderOwnershipEndpointTests(Factory factory)
    {
        _factory = factory;
    }

    // ── Buyer cannot read another buyer's order ─────────────────────────

    [Fact]
    public async Task Buyer_cannot_get_another_buyers_order()
    {
        var buyerA = await CreateUserAsync("ep-own-a@example.com", UserRoles.Buyer);
        var buyerB = await CreateUserAsync("ep-own-b@example.com", UserRoles.Buyer);
        var orderNumber = await SeedOrderAsync(buyerA.Id, PaymentMethodKind.Instapay);

        var tokenB = await IssueTokenAsync(buyerB.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokenB);

        var response = await client.GetAsync($"/api/orders/{orderNumber}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── Anonymous users blocked from protected endpoints ─────────────────

    [Theory]
    [InlineData("GET", "/api/orders")]
    [InlineData("GET", "/api/addresses")]
    public async Task Anonymous_gets_401_from_protected_endpoints(string method, string url)
    {
        var client = _factory.CreateClient();
        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_gets_401_from_order_cancel()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/orders/DM-TEST-001/cancel", new { });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Anonymous_gets_401_from_checkout()
    {
        var client = _factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/checkout", new { });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── Non-admin blocked from admin endpoints ──────────────────────────

    [Fact]
    public async Task Buyer_gets_403_from_admin_orders()
    {
        var buyer = await CreateUserAsync("ep-noadmin@example.com", UserRoles.Buyer);
        var token = await IssueTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/admin/orders");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Buyer_gets_403_from_admin_users()
    {
        var buyer = await CreateUserAsync("ep-noadmin2@example.com", UserRoles.Buyer);
        var token = await IssueTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync("/api/admin/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    // ── Admin role update endpoint does not exist ────────────────────────

    [Fact]
    public async Task Admin_role_update_endpoint_is_not_available()
    {
        var admin = await CreateUserAsync("ep-role-admin@example.com", UserRoles.Admin);
        var adminToken = await IssueTokenAsync(admin.Id, UserRoles.Admin);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var response = await client.PutAsJsonAsync($"/api/admin/users/{Guid.NewGuid()}/roles",
            new { Roles = new[] { "Admin" } });

        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound ||
            response.StatusCode == HttpStatusCode.MethodNotAllowed,
            $"Expected 404 or 405 but got {response.StatusCode}");
    }

    // ── COD proof upload rejected ────────────────────────────────────────

    [Fact]
    public async Task COD_proof_upload_returns_proof_not_required()
    {
        var buyer = await CreateUserAsync("ep-cod-proof@example.com", UserRoles.Buyer);
        var orderNumber = await SeedOrderAsync(buyer.Id, PaymentMethodKind.Cod);

        var token = await IssueTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        using var content = new MultipartFormDataContent();
        var imageContent = new ByteArrayContent([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
        imageContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("image/jpeg");
        content.Add(imageContent, "file", "proof.jpg");

        var response = await client.PostAsync($"/api/orders/{orderNumber}/proof", content);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("proof not required", body, StringComparison.OrdinalIgnoreCase);
    }

    // ── Protected proof file streaming ────────────────────────────────────

    [Fact]
    public async Task Anonymous_gets_401_from_payment_proof_file()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync($"/api/orders/DM-TEST-001/proof/{Guid.NewGuid()}/file");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Buyer_can_stream_own_payment_proof_file()
    {
        var buyer = await CreateUserAsync("ep-proof-owner@example.com", UserRoles.Buyer);
        var (orderNumber, proofId) = await SeedOrderWithProofAsync(buyer.Id);

        var token = await IssueTokenAsync(buyer.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}/proof/{proofId}/file");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("image/jpeg", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(Factory.ProofBytes, await response.Content.ReadAsByteArrayAsync());
    }

    [Fact]
    public async Task Buyer_gets_403_from_another_buyers_payment_proof_file()
    {
        var buyerA = await CreateUserAsync("ep-proof-a@example.com", UserRoles.Buyer);
        var buyerB = await CreateUserAsync("ep-proof-b@example.com", UserRoles.Buyer);
        var (orderNumber, proofId) = await SeedOrderWithProofAsync(buyerA.Id);

        var token = await IssueTokenAsync(buyerB.Id, UserRoles.Buyer);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}/proof/{proofId}/file");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task Admin_can_stream_any_buyers_payment_proof_file()
    {
        var buyer = await CreateUserAsync("ep-proof-admin-buyer@example.com", UserRoles.Buyer);
        var admin = await CreateUserAsync("ep-proof-admin@example.com", UserRoles.Admin);
        var (orderNumber, proofId) = await SeedOrderWithProofAsync(buyer.Id);

        var token = await IssueTokenAsync(admin.Id, UserRoles.Admin);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.GetAsync($"/api/orders/{orderNumber}/proof/{proofId}/file");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(Factory.ProofBytes, await response.Content.ReadAsByteArrayAsync());
    }

    // ── Admin can access any order ───────────────────────────────────────

    [Fact]
    public async Task Admin_can_get_any_buyers_order()
    {
        var buyer = await CreateUserAsync("ep-admin-own-buyer@example.com", UserRoles.Buyer);
        var admin = await CreateUserAsync("ep-admin-own-admin@example.com", UserRoles.Admin);
        var orderNumber = await SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay);

        var adminToken = await IssueTokenAsync(admin.Id, UserRoles.Admin);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var response = await client.GetAsync($"/api/admin/orders/{orderNumber}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── Admin can cancel a Pending order (Pending -> Cancelled) ──────────

    [Fact]
    public async Task Admin_can_cancel_pending_order()
    {
        var buyer = await CreateUserAsync("ep-pending-cancel@example.com", UserRoles.Buyer);
        var admin = await CreateUserAsync("ep-pending-cancel-admin@example.com", UserRoles.Admin);
        var orderNumber = await SeedOrderAsync(buyer.Id, PaymentMethodKind.Instapay, OrderStatus.Pending);

        var adminToken = await IssueTokenAsync(admin.Id, UserRoles.Admin);
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);

        var response = await client.PostAsJsonAsync($"/api/admin/orders/{orderNumber}/transition",
            new { ToStatus = OrderStatus.Cancelled, Reason = "Test cancel" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private async Task<User> CreateUserAsync(string email, string role)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();

        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            UserName = email,
            Email = email,
            FullName = email,
            EmailConfirmed = true,
        };

        await userManager.CreateAsync(user, "Password123!");
        await userManager.AddToRoleAsync(user, role);
        return user;
    }

    private async Task<string> SeedOrderAsync(Guid buyerId, PaymentMethodKind kind,
        OrderStatus status = OrderStatus.Pending)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var paymentMethod = db.PaymentMethods.FirstOrDefault();
        if (paymentMethod is null)
        {
            paymentMethod = new PaymentMethod
            {
                Id = Guid.NewGuid(),
                NameEn = "Test PM",
                NameAr = "Test PM",
                Kind = kind,
                IsActive = true,
            };
            db.PaymentMethods.Add(paymentMethod);
            await db.SaveChangesAsync();
        }

        var orderNumber = $"DM-EP-{Guid.NewGuid():N}"[..20];
        var order = new Order
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
                RecipientName = "Test",
                Phone = "01000000000",
                Governorate = "cairo",
                City = "Maadi",
                StreetAddress = "123 Street",
            },
        };
        db.Orders.Add(order);
        await db.SaveChangesAsync();
        return orderNumber;
    }

    private async Task<(string OrderNumber, Guid ProofId)> SeedOrderWithProofAsync(Guid buyerId)
    {
        var orderNumber = await SeedOrderAsync(
            buyerId,
            PaymentMethodKind.Instapay,
            OrderStatus.PendingPaymentReview);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var order = db.Orders.Single(o => o.OrderNumber == orderNumber);
        var proofId = Guid.NewGuid();

        db.PaymentProofs.Add(new PaymentProof
        {
            Id = proofId,
            OrderId = order.Id,
            FileUrl = "/uploads/payment-proofs/test-proof.jpg",
            FileKey = Factory.ProofFileKey,
            ContentType = "image/jpeg",
            SizeBytes = Factory.ProofBytes.Length,
            Status = PaymentProofStatus.Pending,
            UploadedAt = DateTimeOffset.UtcNow,
        });
        await db.SaveChangesAsync();

        return (orderNumber, proofId);
    }

    private async Task<string> IssueTokenAsync(Guid userId, params string[] roles)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
        var user = await userManager.FindByIdAsync(userId.ToString());
        return jwt.CreateAccessToken(user!, roles).Token;
    }

    public class Factory : IntegrationWebAppFactory
    {
        public const string ProofFileKey = "payment-proofs/test-proof.jpg";
        public static readonly byte[] ProofBytes = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            var storageDescriptors = services
                .Where(d => d.ServiceType == typeof(IFileStorageService))
                .ToList();

            foreach (var descriptor in storageDescriptors)
            {
                services.Remove(descriptor);
            }

            services.AddSingleton<IFileStorageService, ProofFileStorageFake>();
        }
    }

    private sealed class ProofFileStorageFake : IFileStorageService
    {
        public Task<StoredFile> UploadAsync(
            Stream content,
            string folder,
            string originalFileName,
            string contentType,
            CancellationToken ct) => Task.FromResult(new StoredFile(
                "/uploads/payment-proofs/test-proof.jpg",
                Factory.ProofFileKey,
                "image/jpeg",
                Factory.ProofBytes.Length));

        public Task DeleteAsync(string fileKey, CancellationToken ct) => Task.CompletedTask;

        public Task<Stream> OpenReadAsync(string fileKey, CancellationToken ct)
        {
            if (!string.Equals(fileKey, Factory.ProofFileKey, StringComparison.Ordinal))
            {
                throw new FileNotFoundException("Proof file not found.", fileKey);
            }

            return Task.FromResult<Stream>(new MemoryStream(Factory.ProofBytes, writable: false));
        }
    }
}
