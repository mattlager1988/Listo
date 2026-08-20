namespace Listo.Api.Models;

// A "log record" describing an event within a period (e.g. a symptom on a given day).
public class PeriodLogEntry : BaseEntity
{
    public long PeriodLogSysId { get; set; }
    public long EntryTypeSysId { get; set; }

    public DateTime EntryDate { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    public PeriodLog PeriodLog { get; set; } = null!;
    public PeriodLogEntryType EntryType { get; set; } = null!;
}
