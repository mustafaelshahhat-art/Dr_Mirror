using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using DrMirror.Api.Domain.Entities;
using DrMirror.Api.Infrastructure.Persistence;
using DrMirror.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace DrMirror.Tests.Checkout;

/// <summary>
/// Validates rowversion-based stock concurrency against a real SQL Server.
/// Two buyers simultaneously check out the last unit of a variant. SQL Server's
/// <c>rowversion</c> column causes EF Core to throw
/// <c>DbUpdateConcurrencyException</c> for the loser.
///
/// <para>Requires <c>DRMIRROR_TEST_SQL_CONNECTION</c> environment variable.</para>
/// </summary>
[Collection(SqlServerTestCollection.Name)]
public class StockConcurrencySqlServerTests : IClassFixture<StockConcurrencySqlServerTests.Factory>
{
    private readonly Factory _factory;

    public StockConcurrencySqlServerTests(Factory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Concurrent_checkouts_on_SQL_Server_yield_one_success_one_conflict()
    {
        if (!Factory.IsAvailable) return;

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var user1Id = Guid.NewGuid();
        var user2Id = Guid.NewGuid();

        db.Users.AddRange(
            new User { Id = user1Id, FullName = "Buyer 1", Email = "sql-buyer1@example.com", UserName = "sql-buyer1@example.com" },
            new User { Id = user2Id, FullName = "Buyer 2", Email = "sql-buyer2@example.com", UserName = "sql-buyer2@example.com" });

        var paymentMethod = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            NameEn = "Instapay",
            NameAr = "Instapay",
            Kind = DrMirror.Api.Domain.Orders.PaymentMethodKind.Instapay,
            IsActive = true,
        };

        var category = new Category { Id = Guid.NewGuid(), NameEn = "Cat", NameAr = "Cat", Slug = "cat-sql", IsActive = true };
        var product = new Product
        {
            Id = Guid.NewGuid(),
            CategoryId = category.Id,
            NameEn = "SQL Product",
            NameAr = "SQL Product",
            Slug = "sql-product",
            IsPublished = true,
            Price = 100,
        };
        var variant = new ProductVariant
        {
            Id = Guid.NewGuid(),
            ProductId = product.Id,
            Sku = "SQL-SKU-1",
            Size = "M",
            ColorName = "Blue",
            ColorNameAr = "Blue",
            ColorHex = "#0000FF",
            Stock = 1,
            IsActive = true,
        };

        db.Categories.Add(category);
        db.Products.Add(product);
        db.ProductVariants.Add(variant);
        db.PaymentMethods.Add(paymentMethod);

        var cart1 = new DrMirror.Api.Domain.Entities.Cart { Id = Guid.NewGuid(), UserId = user1Id, Items = new List<CartItem>() };
        var cart1Item = new CartItem { Id = Guid.NewGuid(), CartId = cart1.Id, ProductVariantId = variant.Id, Quantity = 1 };
        cart1.Items.Add(cart1Item);

        var cart2 = new DrMirror.Api.Domain.Entities.Cart { Id = Guid.NewGuid(), UserId = user2Id, Items = new List<CartItem>() };
        var cart2Item = new CartItem { Id = Guid.NewGuid(), CartId = cart2.Id, ProductVariantId = variant.Id, Quantity = 1 };
        cart2.Items.Add(cart2Item);

        db.Carts.AddRange(cart1, cart2);
        db.CartItems.AddRange(cart1Item, cart2Item);
        await db.SaveChangesAsync();

        var client1 = _factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddAuthentication("TestAuth").AddScheme<AuthenticationSchemeOptions, SqlCheckoutAuthHandler>("TestAuth", _ => { });
            s.AddScoped(_ => new SqlCheckoutCaller(user1Id));
        })).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client1.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");

        var client2 = _factory.WithWebHostBuilder(b => b.ConfigureServices(s =>
        {
            s.AddAuthentication("TestAuth").AddScheme<AuthenticationSchemeOptions, SqlCheckoutAuthHandler>("TestAuth", _ => { });
            s.AddScoped(_ => new SqlCheckoutCaller(user2Id));
        })).CreateClient(new WebApplicationFactoryClientOptions { AllowAutoRedirect = false });
        client2.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("TestAuth");

        var req = new
        {
            PaymentMethodId = paymentMethod.Id,
            ShippingAddress = new
            {
                RecipientName = "Test",
                Phone = "01000000000",
                Governorate = "cairo",
                City = "Maadi",
                StreetAddress = "123 Street",
            },
        };

        var results = await Task.WhenAll(
            client1.PostAsJsonAsync("/api/checkout", req),
            client2.PostAsJsonAsync("/api/checkout", req));

        var successCount = results.Count(r => r.StatusCode == HttpStatusCode.Created);
        var conflictCount = results.Count(r => r.StatusCode == HttpStatusCode.Conflict);

        Assert.True(successCount == 1,
            $"Expected exactly 1 Created. Got: {results[0].StatusCode}, {results[1].StatusCode}");
        Assert.True(conflictCount == 1,
            $"Expected exactly 1 Conflict. Got: {results[0].StatusCode}, {results[1].StatusCode}");
    }

    public class Factory : SqlServerWebAppFactory { }
}

public class SqlCheckoutCaller
{
    public Guid UserId { get; }
    public SqlCheckoutCaller(Guid userId) => UserId = userId;
}

public class SqlCheckoutAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly SqlCheckoutCaller _user;

    public SqlCheckoutAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        SqlCheckoutCaller user)
        : base(options, logger, encoder)
    {
        _user = user;
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, _user.UserId.ToString()) };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "TestAuth");
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
