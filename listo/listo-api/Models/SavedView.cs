namespace Listo.Api.Models;

public class SavedView : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string ViewType { get; set; } = string.Empty; // "accounts", "types", "owners"
    public string Configuration { get; set; } = string.Empty; // JSON string of column state
    public long UserSysId { get; set; }
    public bool IsDefault { get; set; } = false;

    public User User { get; set; } = null!;
}
