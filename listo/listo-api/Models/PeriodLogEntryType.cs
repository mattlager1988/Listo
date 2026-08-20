namespace Listo.Api.Models;

// Admin-managed lookup list for the "type" of a period log record.
public class PeriodLogEntryType : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;

    public ICollection<PeriodLogEntry> Entries { get; set; } = new List<PeriodLogEntry>();
}
