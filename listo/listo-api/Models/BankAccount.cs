namespace Listo.Api.Models;

public enum BankAccountType
{
    Checking,
    Savings,
    HSA
}

public class BankAccount : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public BankAccountType AccountType { get; set; } = BankAccountType.Checking;
    public string? AccountNumber { get; set; }
    public string? RoutingNumber { get; set; }
    public decimal Balance { get; set; }
    public string? Color { get; set; }
    public bool IsDiscontinued { get; set; } = false;
    public DateTime? DiscontinuedDate { get; set; }

    public ICollection<LedgerTransaction> LedgerTransactions { get; set; } = new List<LedgerTransaction>();
}
