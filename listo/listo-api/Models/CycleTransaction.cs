namespace Listo.Api.Models;

public enum CycleTransactionType
{
    Credit,
    Debit
}

public enum CycleTransactionStatus
{
    Confirmed,
    Planned,
    Estimated
}

public class CycleTransaction : BaseEntity
{
    public long CyclePlanSysId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public CycleTransactionType TransactionType { get; set; } = CycleTransactionType.Credit;
    public CycleTransactionStatus Status { get; set; } = CycleTransactionStatus.Estimated;
    public string? Notes { get; set; }

    public CyclePlan CyclePlan { get; set; } = null!;
}
