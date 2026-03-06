namespace Listo.Api.Models;

public enum CyclePlanStatus
{
    Pending,
    Active,
    Completed
}

public class CyclePlan : BaseEntity
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public long CycleGoalSysId { get; set; }
    public CyclePlanStatus Status { get; set; } = CyclePlanStatus.Pending;
    public string? Notes { get; set; }
    public bool IsDiscontinued { get; set; } = false;
    public DateTime? DiscontinuedDate { get; set; }

    public CycleGoal CycleGoal { get; set; } = null!;
}
