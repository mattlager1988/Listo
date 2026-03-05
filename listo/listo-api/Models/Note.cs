namespace Listo.Api.Models;

public class Note : BaseEntity
{
    public string Subject { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsDiscontinued { get; set; }
    public DateTime? DiscontinuedDate { get; set; }

    // Foreign key
    public long UserSysId { get; set; }

    // Navigation property
    public User User { get; set; } = null!;
}
