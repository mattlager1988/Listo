namespace Listo.Api.Models;

public class PasswordEntry : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string? EncryptedUsername { get; set; }
    public string? EncryptedPassword { get; set; }
    public string? EncryptedNotes { get; set; }
    public bool IsFavorite { get; set; } = false;

    // Foreign keys
    public long? CategorySysId { get; set; }
    public long UserSysId { get; set; }

    // Navigation properties
    public PasswordCategory? Category { get; set; }
    public User User { get; set; } = null!;
}
