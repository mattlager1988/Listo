namespace Listo.Api.Models;

public class CycleTransaction : BaseEntity
{
    public long CyclePlanSysId { get; set; }
    public decimal AmountIn { get; set; }
    public decimal AmountOut { get; set; }
    public string? Description { get; set; }
    public DateTime TransactionDate { get; set; }

    public CyclePlan CyclePlan { get; set; } = null!;
}
