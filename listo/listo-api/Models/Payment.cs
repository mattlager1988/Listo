namespace Listo.Api.Models;

public enum PaymentStatus
{
    Pending,
    Complete
}

public class Payment : BaseEntity
{
    public long AccountSysId { get; set; }
    public long PaymentMethodSysId { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public string? ConfirmationNumber { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public DateTime? CompletedDate { get; set; }
    public long? BankAccountSysId { get; set; }
    public DateTime? DueDate { get; set; }

    public Account Account { get; set; } = null!;
    public PaymentMethod PaymentMethod { get; set; } = null!;
    public BankAccount? BankAccount { get; set; }
    public LedgerTransaction? LedgerTransaction { get; set; }
}
