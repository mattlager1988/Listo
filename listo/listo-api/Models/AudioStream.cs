namespace Listo.Api.Models;

public class AudioStream : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Description { get; set; }
    public long UserSysId { get; set; }
    public User User { get; set; } = null!;
}
