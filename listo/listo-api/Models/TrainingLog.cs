namespace Listo.Api.Models;

public class TrainingLog : BaseEntity
{
    public DateTime Date { get; set; }
    public string Description { get; set; } = string.Empty;  // HTML content from rich text editor
    public decimal HoursFlown { get; set; }
    public bool IsDiscontinued { get; set; }
    public DateTime? DiscontinuedDate { get; set; }

    // Foreign keys
    public long UserSysId { get; set; }
    public long TrainingTypeSysId { get; set; }
    public long? AircraftSysId { get; set; }  // Optional - ground school doesn't need aircraft

    // Navigation properties
    public User User { get; set; } = null!;
    public TrainingType TrainingType { get; set; } = null!;
    public Aircraft? Aircraft { get; set; }
}
