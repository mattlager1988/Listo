namespace Listo.Api.Models;

public class PeriodLog : BaseEntity
{
    public DateTime StartDate { get; set; }
    public int PainSeverity { get; set; }   // 1-5
    public int Mood { get; set; }            // 1-5
    public string? Notes { get; set; }

    // Foreign key
    public long UserSysId { get; set; }

    // Navigation property
    public User User { get; set; } = null!;
}
