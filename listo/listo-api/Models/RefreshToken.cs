namespace Listo.Api.Models;

public class RefreshToken : BaseEntity
{
    public long UsersSysId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool Revoked { get; set; }

    public User User { get; set; } = null!;
}
