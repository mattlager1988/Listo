namespace Listo.Api.Models;

public class AccountCard : BaseEntity
{
    public long AccountSysId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? EncryptedCardNumber { get; set; }
    public string? ExpirationDate { get; set; }  // MM/YY format
    public string? EncryptedCvv { get; set; }
    public string? PhoneNumber { get; set; }

    // Card images stored as blobs
    public byte[]? FrontImage { get; set; }
    public string? FrontImageMimeType { get; set; }
    public byte[]? BackImage { get; set; }
    public string? BackImageMimeType { get; set; }

    public Account Account { get; set; } = null!;
}
