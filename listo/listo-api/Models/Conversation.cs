namespace Listo.Api.Models;

public class Conversation : BaseEntity
{
    // "direct" (1:1) or "group"
    public string Type { get; set; } = "direct";

    // Group name; null for direct conversations.
    public string? Name { get; set; }

    public long CreatedBySysId { get; set; }

    public ICollection<ConversationParticipant> Participants { get; set; } = new List<ConversationParticipant>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
