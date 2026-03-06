namespace Listo.Api.Models;

public enum AccountFlag
{
    Standard,
    Alert,
    Static,
    OnHold
}

public class Account : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public long AccountTypeSysId { get; set; }
    public long AccountOwnerSysId { get; set; }
    public decimal AmountDue { get; set; }
    public DateTime? DueDate { get; set; }
    public string? AccountNumber { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WebAddress { get; set; }
    public string? Username { get; set; }
    public string? EncryptedPassword { get; set; }
    public bool AutoPay { get; set; } = false;
    public bool ResetAmountDue { get; set; } = false;
    public AccountFlag AccountFlag { get; set; } = AccountFlag.Standard;
    public string? Notes { get; set; }
    public bool IsDiscontinued { get; set; } = false;
    public DateTime? DiscontinuedDate { get; set; }
    public long? DefaultPaymentMethodSysId { get; set; }
    public long? DefaultBankAccountSysId { get; set; }

    public AccountType AccountType { get; set; } = null!;
    public AccountOwner AccountOwner { get; set; } = null!;
    public PaymentMethod? DefaultPaymentMethod { get; set; }
    public BankAccount? DefaultBankAccount { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
