namespace Listo.Api.Models;

public enum TransactionType
{
    Deposit,
    Withdrawal
}

public class LedgerTransaction : BaseEntity
{
    public long BankAccountSysId { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal Amount { get; set; }
    public string? Description { get; set; }
    public long? PaymentSysId { get; set; }

    public BankAccount BankAccount { get; set; } = null!;
    public Payment? Payment { get; set; }
}
