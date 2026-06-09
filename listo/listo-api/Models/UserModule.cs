namespace Listo.Api.Models;

public class UserModule : BaseEntity
{
    public long UserSysId { get; set; }
    public string ModuleKey { get; set; } = string.Empty;

    public User User { get; set; } = null!;
}
