namespace DrMirror.Api.Domain.Entities;

public class ReturnRequestItem
{
    public Guid Id { get; set; }
    public Guid ReturnRequestId { get; set; }
    public ReturnRequest? ReturnRequest { get; set; }
    public Guid OrderItemId { get; set; }
    public OrderItem? OrderItem { get; set; }
    public Guid ProductVariantId { get; set; }
    public ProductVariant? ProductVariant { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Size { get; set; } = string.Empty;
    public string ColorName { get; set; } = string.Empty;
    public string ColorNameAr { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;
    public string? PrimaryImageUrl { get; set; }
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
}
