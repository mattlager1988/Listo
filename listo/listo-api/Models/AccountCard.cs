namespace Listo.Api.Models;

public class AccountCard : BaseEntity
{
    public long AccountSysId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? EncryptedCardNumber { get; set; }
    public string? ExpirationDate { get; set; }  // MM/YY format
    public string? EncryptedCvv { get; set; }
    public string? PhoneNumber { get; set; }

    // Image stored via Document system (module=finance, entityType=account_card, entitySysId=this.SysId)

    public Account Account { get; set; } = null!;
}
