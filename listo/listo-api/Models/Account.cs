namespace Listo.Api.Models;

public class Account : BaseEntity
{
    // Grid fields
    public string Name { get; set; } = string.Empty;
    public long AccountTypeSysId { get; set; }
    public long AccountOwnerSysId { get; set; }
    public decimal? AmountDue { get; set; }
    public DateTime? DueDate { get; set; }

    // Modal-only fields
    public string? AccountNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WebAddress { get; set; }
    public string? Username { get; set; }
    public string? EncryptedPassword { get; set; }  // AES-256 encrypted
    public bool AutoPay { get; set; } = false;
    public bool ResetAmountDue { get; set; } = false;
    public string AccountFlag { get; set; } = "Standard";  // Standard, Alert, Static, OnHold

    // Navigation properties
    public AccountType AccountType { get; set; } = null!;
    public AccountOwner AccountOwner { get; set; } = null!;
}
