namespace Listo.Api.Models;

public class Aircraft : BaseEntity
{
    public string PlaneId { get; set; } = string.Empty;  // e.g., "N12345"
    public string Name { get; set; } = string.Empty;     // e.g., "Cessna 172"
    public bool IsDeleted { get; set; } = false;

    // Navigation property for usage tracking
    public ICollection<TrainingLog> TrainingLogs { get; set; } = new List<TrainingLog>();
}
