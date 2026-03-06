namespace Listo.Api.Models;

public class CycleGoal : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;

    public ICollection<CyclePlan> CyclePlans { get; set; } = new List<CyclePlan>();
}
