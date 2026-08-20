namespace Listo.Api.Models;

public class PeriodLog : BaseEntity
{
    public DateTime StartDate { get; set; }

    // When the "pre-week" phase began (about a week before the official period).
    public DateTime? PreWeekStartDate { get; set; }

    // True while StartDate is still an estimate; cleared once the official date is confirmed.
    public bool IsStartDateEstimated { get; set; } = true;

    public string? Notes { get; set; }

    // Foreign key
    public long UserSysId { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
    public ICollection<PeriodLogEntry> Entries { get; set; } = new List<PeriodLogEntry>();
}
