namespace Listo.Api.Models;

public class PasswordCategory : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public bool IsDeleted { get; set; } = false;

    public ICollection<PasswordEntry> PasswordEntries { get; set; } = new List<PasswordEntry>();
}
