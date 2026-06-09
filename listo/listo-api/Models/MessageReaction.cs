namespace Listo.Api.Models;

public class MessageReaction : BaseEntity
{
    public long MessageSysId { get; set; }
    public long UserSysId { get; set; }
    public string Emoji { get; set; } = string.Empty;

    public Message Message { get; set; } = null!;
    public User User { get; set; } = null!;
}
