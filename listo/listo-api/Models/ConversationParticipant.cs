namespace Listo.Api.Models;

public class ConversationParticipant : BaseEntity
{
    public long ConversationSysId { get; set; }
    public long UserSysId { get; set; }

    // Tracks the last message this user has read, for unread counts / read receipts.
    public long? LastReadMessageSysId { get; set; }

    // "Delete for me": when set, this user only sees messages newer than this
    // timestamp, and the conversation is hidden from their list until a newer
    // message arrives. Does not affect other participants.
    public DateTime? ClearedAt { get; set; }

    public Conversation Conversation { get; set; } = null!;
    public User User { get; set; } = null!;
}
