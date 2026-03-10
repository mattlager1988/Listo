namespace Listo.Api.Models;

public class DashboardLayout : BaseEntity
{
    public long UserSysId { get; set; }
    public string LayoutJson { get; set; } = string.Empty; // JSON string of grid layout

    public User User { get; set; } = null!;
}
