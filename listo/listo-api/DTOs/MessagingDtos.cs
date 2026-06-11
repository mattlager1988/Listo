namespace Listo.Api.DTOs;

public record ParticipantResponse(
    long UserSysId,
    string FirstName,
    string LastName,
    long? LastReadMessageSysId,
    string? ProfilePhoto
);

public record AttachmentResponse(
    long SysId,
    string OriginalFileName,
    string MimeType,
    long FileSize,
    string Kind
);

public record ReactionResponse(
    long SysId,
    long MessageSysId,
    long UserSysId,
    string Emoji
);

public record MessageResponse(
    long SysId,
    long ConversationSysId,
    long SenderSysId,
    string SenderName,
    string? Body,
    DateTime CreateTimestamp,
    IReadOnlyList<AttachmentResponse> Attachments,
    IReadOnlyList<ReactionResponse> Reactions
);

public record ConversationResponse(
    long SysId,
    string Type,
    string? Name,
    IReadOnlyList<ParticipantResponse> Participants,
    MessageResponse? LastMessage,
    int UnreadCount,
    DateTime UpdatedAt
);

public record CreateConversationRequest(
    string Type,
    string? Name,
    IReadOnlyList<long> ParticipantUserIds
);

public record SendMessageRequest(
    string? Body,
    IReadOnlyList<long>? AttachmentIds
);

public record AddReactionRequest(string Emoji);

public record MarkReadRequest(long LastReadMessageSysId);

public record UpdateGroupRequest(
    string? Name,
    IReadOnlyList<long>? AddUserIds,
    IReadOnlyList<long>? RemoveUserIds
);

// Lightweight user list for starting new chats (any Listo user).
public record MessagingUserResponse(
    long SysId,
    string FirstName,
    string LastName,
    string Email
);

// Real-time event payloads pushed over SignalR.
public record ReadReceiptPayload(long ConversationSysId, long UserSysId, long LastReadMessageSysId);
public record ConversationChangedPayload(long ConversationSysId);
