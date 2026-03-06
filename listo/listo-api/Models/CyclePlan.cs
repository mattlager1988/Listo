namespace Listo.Api.Models;

public class CyclePlan : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public long CycleGoalSysId { get; set; }
    public string? Notes { get; set; }
    public bool IsDiscontinued { get; set; } = false;
    public DateTime? DiscontinuedDate { get; set; }

    public CycleGoal CycleGoal { get; set; } = null!;
}
