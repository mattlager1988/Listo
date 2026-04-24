namespace Listo.Api.Models;

public class AudioStreamCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;
}
