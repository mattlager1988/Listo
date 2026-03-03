namespace Listo.Api.Models;

public class TrainingType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;

    // Navigation property for usage tracking
    public ICollection<TrainingLog> TrainingLogs { get; set; } = new List<TrainingLog>();
}
