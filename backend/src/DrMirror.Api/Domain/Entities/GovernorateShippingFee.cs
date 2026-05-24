namespace DrMirror.Api.Domain.Entities;

public class GovernorateShippingFee
{
    public Guid Id { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string NameAr { get; set; } = string.Empty;
    public decimal Fee { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public Guid? LastUpdatedByAdminId { get; set; }
    public User? LastUpdatedByAdmin { get; set; }
    public byte[]? RowVersion { get; set; }
}
