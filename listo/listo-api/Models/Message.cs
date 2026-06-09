namespace Listo.Api.Models;

public class Message : BaseEntity
{
    public long ConversationSysId { get; set; }
    public long SenderSysId { get; set; }

    // Text body; null/empty when the message is attachment-only.
    public string? Body { get; set; }

    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
    public ICollection<MessageAttachment> Attachments { get; set; } = new List<MessageAttachment>();
    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
}
