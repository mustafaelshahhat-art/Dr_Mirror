using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Domain.Identity;
using DrMirror.Api.Domain.Orders;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Orders;

[Collection(IntegrationTestCollection.Name)]
public class CancellationConcurrencyTests : IClassFixture<CancellationConcurrencyTests.Factory>
{
    private readonly Factory _factory;

    public CancellationConcurrencyTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Buyer_cancellation_stock_conflict_returns_409()
    {
        var seeded = await _factory.SeedOrderAsync(OrderStatus.Confirmed);
        var client = MakeClient(seeded.BuyerId);

        var response = await client.PostAsJsonAsync($"/api/orders/{seeded.OrderNumber}/cancel", new { Reason = "race" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Admin_cancellation_stock_conflict_returns_409()
    {
        var seeded = await _factory.SeedOrderAsync(OrderStatus.Confirmed);
        var client = MakeClient(Guid.NewGuid(), UserRoles.Admin);

        var response = await client.PostAsJsonAsync($"/api/admin/orders/{seeded.OrderNumber}/transition", new
        {
            ToStatus = OrderStatus.Cancelled,
            Reason = "admin race",
        });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    private HttpClient MakeClient(Guid userId, params string[] roles)
    {
        var client = _factory.WithWebHostBuilder(b =>
        {
            b.ConfigureServices(s =>
            {
                s.AddAuthentication("TestAuth")
                 .AddScheme<AuthenticationSchemeOptions, CancellationTestAuthHandler>("TestAuth", _ => { });
                s.AddSingleton(new CancellationTestCaller(userId, roles));
            });
        }).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");
        return client;
    }

    public sealed record SeededOrder(Guid BuyerId, string OrderNumber);

    public class Factory : IntegrationWebAppFactory
    {
        public override string DbName { get; } = "CancellationConcurrencyTest_" + Guid.NewGuid();

        protected override void ConfigureDbContext(DbContextOptionsBuilder options)
        {
            base.ConfigureDbContext(options);
            options.AddInterceptors(new ThrowOnCancellationRestockInterceptor());
        }

        public async Task<SeededOrder> SeedOrderAsync(OrderStatus status)
        {
            using var scope = Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var buyerId = Guid.NewGuid();
            var orderNumber = $"DM-2026-{Random.Shared.Next(100000, 999999)}";
            var user = new User { Id = buyerId, FullName = "Buyer", Email = $"{buyerId:N}@example.com", UserName = $"{buyerId:N}@example.com" };
            var category = new Category { Id = Guid.NewGuid(), NameEn = "Cat", NameAr = "Cat", Slug = Guid.NewGuid().ToString("N"), IsActive = true };
            var product = new Product { Id = Guid.NewGuid(), CategoryId = category.Id, NameEn = "Product", NameAr = "Product", Slug = Guid.NewGuid().ToString("N"), IsPublished = true, Price = 100 };
            var variant = new ProductVariant { Id = Guid.NewGuid(), ProductId = product.Id, Sku = Guid.NewGuid().ToString("N"), Size = "M", ColorName = "Blue", ColorNameAr = "Blue", ColorHex = "#000000", Stock = 5, IsActive = true };
            var payment = new PaymentMethod { Id = Guid.NewGuid(), Code = Guid.NewGuid().ToString("N"), NameEn = "COD", NameAr = "COD", Kind = PaymentMethodKind.Cod, IsActive = true };
            var order = new Order
            {
                Id = Guid.NewGuid(),
                OrderNumber = orderNumber,
                BuyerUserId = buyerId,
                Status = status,
                SubTotal = 100,
                Total = 100,
                Currency = "EGP",
                PaymentMethodId = payment.Id,
                PaymentMethodKind = payment.Kind,
                PaymentMethodNameEn = payment.NameEn,
                PaymentMethodNameAr = payment.NameAr,
                ShippingAddress = new ShippingAddress { RecipientName = "Buyer", Phone = "01000000000", Governorate = "cairo", City = "Cairo", StreetAddress = "Street" },
            };
            order.Items.Add(new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = product.Id,
                ProductVariantId = variant.Id,
                ProductVariant = variant,
                NameEn = product.NameEn,
                NameAr = product.NameAr,
                Sku = variant.Sku,
                Size = variant.Size,
                ColorName = variant.ColorName,
                ColorNameAr = variant.ColorNameAr,
                ColorHex = variant.ColorHex,
                UnitPrice = 100,
                Quantity = 1,
                LineTotal = 100,
            });

            db.Users.Add(user);
            db.Categories.Add(category);
            db.Products.Add(product);
            db.ProductVariants.Add(variant);
            db.PaymentMethods.Add(payment);
            db.Orders.Add(order);
            await db.SaveChangesAsync();
            return new SeededOrder(buyerId, orderNumber);
        }
    }
}

public sealed class ThrowOnCancellationRestockInterceptor : SaveChangesInterceptor
{
    public override ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var db = eventData.Context;
        if (db is not null
            && db.ChangeTracker.Entries<ProductVariant>().Any(e => e.State == EntityState.Modified)
            && db.ChangeTracker.Entries<Order>().Any(e => e.Entity.Status == OrderStatus.Cancelled && e.State == EntityState.Modified))
        {
            throw new DbUpdateConcurrencyException("Simulated restock concurrency conflict");
        }

        return base.SavingChangesAsync(eventData, result, cancellationToken);
    }
}

public sealed record CancellationTestCaller(Guid UserId, string[] Roles);

public class CancellationTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly CancellationTestCaller _caller;

    public CancellationTestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        CancellationTestCaller caller)
        : base(options, logger, encoder)
    {
        _caller = caller;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, _caller.UserId.ToString()),
            new(JwtRegisteredClaimNames.Sub, _caller.UserId.ToString()),
        };
        claims.AddRange(_caller.Roles.Select(role => new Claim(ClaimTypes.Role, role)));
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
