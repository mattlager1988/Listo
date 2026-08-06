namespace Listo.Api.Models;

public class User : BaseEntity
{
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string Role { get; set; } = "user";
    public bool MfaEnabled { get; set; }
    public string? MfaSecret { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastLoginAt { get; set; }
    public bool SidebarCollapsed { get; set; } = true;
    public string? PushoverKey { get; set; }
    // Small square avatar stored as a base64 data URL (e.g. data:image/jpeg;base64,...).
    public string? ProfilePhoto { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<TrustedDevice> TrustedDevices { get; set; } = new List<TrustedDevice>();
    public ICollection<UserModule> Modules { get; set; } = new List<UserModule>();
}
