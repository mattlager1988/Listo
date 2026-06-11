using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Hubs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public record NewAttachment(
    string FileName,
    string OriginalFileName,
    string MimeType,
    long FileSize,
    string StoragePath,
    string Kind
);

public interface IMessagingService
{
    Task<IEnumerable<ConversationResponse>> GetConversationsAsync(long currentUserId);
    Task<ConversationResponse?> GetConversationAsync(long conversationId, long currentUserId);
    Task<ConversationResponse> CreateConversationAsync(long currentUserId, CreateConversationRequest request);
    Task<IEnumerable<MessageResponse>> GetMessagesAsync(long conversationId, long currentUserId, long? beforeSysId, int take);
    Task<MessageResponse> SendMessageAsync(long currentUserId, long conversationId, string? body, IReadOnlyList<NewAttachment>? attachments = null);
    Task<ReactionResponse> AddReactionAsync(long currentUserId, long messageId, string emoji);
    Task<bool> RemoveReactionAsync(long currentUserId, long messageId, string emoji);
    Task<bool> MarkReadAsync(long currentUserId, long conversationId, long lastReadMessageSysId);
    Task<bool> DeleteConversationForUserAsync(long currentUserId, long conversationId);
    Task<ConversationResponse> UpdateGroupAsync(long currentUserId, long conversationId, UpdateGroupRequest request);
    Task<IEnumerable<MessagingUserResponse>> GetUsersAsync(long currentUserId);
    Task<bool> IsParticipantAsync(long conversationId, long userId);
    Task<IEnumerable<long>> GetParticipantUserIdsAsync(long conversationId);
    Task<(string StoragePath, string MimeType, string OriginalFileName)?> GetAttachmentAsync(long attachmentId, long currentUserId);
}

public class MessagingService : IMessagingService
{
    private readonly ListoDbContext _context;
    private readonly IHubContext<MessagingHub> _hub;

    public MessagingService(ListoDbContext context, IHubContext<MessagingHub> hub)
    {
        _context = context;
        _hub = hub;
    }

    private async Task PushToParticipantsAsync(long conversationId, string method, object payload)
    {
        var participantIds = await GetParticipantUserIdsAsync(conversationId);
        var groups = participantIds.Select(MessagingHub.UserGroup).ToList();
        if (groups.Count > 0)
            await _hub.Clients.Groups(groups).SendAsync(method, payload);
    }

    public async Task<bool> IsParticipantAsync(long conversationId, long userId) =>
        await _context.ConversationParticipants
            .AnyAsync(p => p.ConversationSysId == conversationId && p.UserSysId == userId);

    public async Task<IEnumerable<long>> GetParticipantUserIdsAsync(long conversationId) =>
        await _context.ConversationParticipants
            .Where(p => p.ConversationSysId == conversationId)
            .Select(p => p.UserSysId)
            .ToListAsync();

    public async Task<IEnumerable<ConversationResponse>> GetConversationsAsync(long currentUserId)
    {
        var conversations = await _context.Conversations
            .Where(c => c.Participants.Any(p => p.UserSysId == currentUserId))
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .ToListAsync();

        var result = new List<ConversationResponse>();
        foreach (var conv in conversations)
        {
            // "Delete for me": hide cleared conversations until a newer message arrives.
            var cleared = conv.Participants.FirstOrDefault(p => p.UserSysId == currentUserId)?.ClearedAt;
            if (cleared != null)
            {
                var hasNewer = await _context.Messages
                    .AnyAsync(m => m.ConversationSysId == conv.SysId && m.CreateTimestamp > cleared.Value);
                if (!hasNewer) continue;
            }
            result.Add(await MapConversationAsync(conv, currentUserId));
        }

        return result.OrderByDescending(c => c.UpdatedAt);
    }

    public async Task<ConversationResponse?> GetConversationAsync(long conversationId, long currentUserId)
    {
        if (!await IsParticipantAsync(conversationId, currentUserId))
            throw new UnauthorizedAccessException("Not a participant of this conversation");

        var conv = await _context.Conversations
            .Where(c => c.SysId == conversationId)
            .Include(c => c.Participants).ThenInclude(p => p.User)
            .FirstOrDefaultAsync();

        return conv == null ? null : await MapConversationAsync(conv, currentUserId);
    }

    public async Task<ConversationResponse> CreateConversationAsync(long currentUserId, CreateConversationRequest request)
    {
        if (request.Type == "direct")
        {
            var others = request.ParticipantUserIds.Where(id => id != currentUserId).Distinct().ToList();
            if (others.Count != 1)
                throw new ArgumentException("A direct conversation requires exactly one other participant");
            return await GetOrCreateDirectAsync(currentUserId, others[0]);
        }

        if (request.Type == "group")
        {
            var memberIds = request.ParticipantUserIds.Append(currentUserId).Distinct().ToList();
            if (memberIds.Count < 2)
                throw new ArgumentException("A group conversation requires at least one other participant");

            await ValidateUsersExistAsync(memberIds);

            var conv = new Conversation
            {
                Type = "group",
                Name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim(),
                CreatedBySysId = currentUserId,
            };
            _context.Conversations.Add(conv);
            await _context.SaveChangesAsync();

            foreach (var uid in memberIds)
                _context.ConversationParticipants.Add(new ConversationParticipant
                {
                    ConversationSysId = conv.SysId,
                    UserSysId = uid,
                });
            await _context.SaveChangesAsync();

            await PushToParticipantsAsync(conv.SysId, "ConversationChanged", new ConversationChangedPayload(conv.SysId));
            return (await GetConversationAsync(conv.SysId, currentUserId))!;
        }

        throw new ArgumentException("Conversation type must be 'direct' or 'group'");
    }

    private async Task<ConversationResponse> GetOrCreateDirectAsync(long currentUserId, long otherUserId)
    {
        await ValidateUsersExistAsync(new[] { otherUserId });

        var existing = await _context.Conversations
            .Where(c => c.Type == "direct"
                && c.Participants.Count == 2
                && c.Participants.Any(p => p.UserSysId == currentUserId)
                && c.Participants.Any(p => p.UserSysId == otherUserId))
            .FirstOrDefaultAsync();

        if (existing != null)
            // Reuse the existing conversation. If the user had deleted it for
            // themselves, their ClearedAt stays set so old history remains hidden
            // and the chat starts fresh; the frontend opens it directly.
            return (await GetConversationAsync(existing.SysId, currentUserId))!;

        var conv = new Conversation
        {
            Type = "direct",
            Name = null,
            CreatedBySysId = currentUserId,
        };
        _context.Conversations.Add(conv);
        await _context.SaveChangesAsync();

        _context.ConversationParticipants.Add(new ConversationParticipant { ConversationSysId = conv.SysId, UserSysId = currentUserId });
        _context.ConversationParticipants.Add(new ConversationParticipant { ConversationSysId = conv.SysId, UserSysId = otherUserId });
        await _context.SaveChangesAsync();

        await PushToParticipantsAsync(conv.SysId, "ConversationChanged", new ConversationChangedPayload(conv.SysId));
        return (await GetConversationAsync(conv.SysId, currentUserId))!;
    }

    public async Task<IEnumerable<MessageResponse>> GetMessagesAsync(long conversationId, long currentUserId, long? beforeSysId, int take)
    {
        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationSysId == conversationId && p.UserSysId == currentUserId)
            ?? throw new UnauthorizedAccessException("Not a participant of this conversation");

        take = Math.Clamp(take <= 0 ? 50 : take, 1, 200);

        var query = _context.Messages
            .Where(m => m.ConversationSysId == conversationId);
        // "Delete for me": only show messages newer than the user's clear point.
        if (participant.ClearedAt != null)
            query = query.Where(m => m.CreateTimestamp > participant.ClearedAt.Value);
        if (beforeSysId.HasValue)
            query = query.Where(m => m.SysId < beforeSysId.Value);

        var messages = await query
            .OrderByDescending(m => m.SysId)
            .Take(take)
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .ToListAsync();

        // Return oldest-first for display.
        return messages.OrderBy(m => m.SysId).Select(MapMessage).ToList();
    }

    public async Task<MessageResponse> SendMessageAsync(long currentUserId, long conversationId, string? body, IReadOnlyList<NewAttachment>? attachments = null)
    {
        if (!await IsParticipantAsync(conversationId, currentUserId))
            throw new UnauthorizedAccessException("Not a participant of this conversation");

        var hasAttachments = attachments != null && attachments.Count > 0;
        if (string.IsNullOrWhiteSpace(body) && !hasAttachments)
            throw new ArgumentException("Message must have a body or at least one attachment");

        var message = new Message
        {
            ConversationSysId = conversationId,
            SenderSysId = currentUserId,
            Body = string.IsNullOrWhiteSpace(body) ? null : body,
        };

        if (hasAttachments)
        {
            foreach (var a in attachments!)
                message.Attachments.Add(new MessageAttachment
                {
                    FileName = a.FileName,
                    OriginalFileName = a.OriginalFileName,
                    MimeType = a.MimeType,
                    FileSize = a.FileSize,
                    StoragePath = a.StoragePath,
                    Kind = a.Kind,
                });
        }

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Reload with sender for the response.
        var sender = await _context.Users.FindAsync(currentUserId);
        message.Sender = sender!;
        var response = MapMessage(message);

        await PushToParticipantsAsync(conversationId, "MessageReceived", response);
        return response;
    }

    public async Task<ReactionResponse> AddReactionAsync(long currentUserId, long messageId, string emoji)
    {
        if (string.IsNullOrWhiteSpace(emoji))
            throw new ArgumentException("Emoji is required");

        var message = await _context.Messages.FindAsync(messageId)
            ?? throw new KeyNotFoundException("Message not found");

        if (!await IsParticipantAsync(message.ConversationSysId, currentUserId))
            throw new UnauthorizedAccessException("Not a participant of this conversation");

        var existing = await _context.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageSysId == messageId && r.UserSysId == currentUserId && r.Emoji == emoji);
        if (existing != null)
            return new ReactionResponse(existing.SysId, existing.MessageSysId, existing.UserSysId, existing.Emoji);

        var reaction = new MessageReaction
        {
            MessageSysId = messageId,
            UserSysId = currentUserId,
            Emoji = emoji,
        };
        _context.MessageReactions.Add(reaction);
        await _context.SaveChangesAsync();

        var response = new ReactionResponse(reaction.SysId, reaction.MessageSysId, reaction.UserSysId, reaction.Emoji);
        await PushToParticipantsAsync(message.ConversationSysId, "ReactionAdded", response);
        return response;
    }

    public async Task<bool> RemoveReactionAsync(long currentUserId, long messageId, string emoji)
    {
        var reaction = await _context.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageSysId == messageId && r.UserSysId == currentUserId && r.Emoji == emoji);
        if (reaction == null) return false;

        var message = await _context.Messages.FindAsync(messageId);
        _context.MessageReactions.Remove(reaction);
        await _context.SaveChangesAsync();

        if (message != null)
            await PushToParticipantsAsync(message.ConversationSysId, "ReactionRemoved",
                new ReactionResponse(reaction.SysId, messageId, currentUserId, emoji));
        return true;
    }

    public async Task<bool> MarkReadAsync(long currentUserId, long conversationId, long lastReadMessageSysId)
    {
        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationSysId == conversationId && p.UserSysId == currentUserId);
        if (participant == null)
            throw new UnauthorizedAccessException("Not a participant of this conversation");

        if (participant.LastReadMessageSysId == null || lastReadMessageSysId > participant.LastReadMessageSysId.Value)
        {
            participant.LastReadMessageSysId = lastReadMessageSysId;
            await _context.SaveChangesAsync();

            await PushToParticipantsAsync(conversationId, "ReadReceiptUpdated",
                new ReadReceiptPayload(conversationId, currentUserId, lastReadMessageSysId));
        }
        return true;
    }

    public async Task<bool> DeleteConversationForUserAsync(long currentUserId, long conversationId)
    {
        var participant = await _context.ConversationParticipants
            .FirstOrDefaultAsync(p => p.ConversationSysId == conversationId && p.UserSysId == currentUserId);
        if (participant == null)
            throw new UnauthorizedAccessException("Not a participant of this conversation");

        // Hide for this user only; the conversation and its messages remain for others.
        participant.ClearedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // Update only this user's other devices.
        await _hub.Clients.Group(MessagingHub.UserGroup(currentUserId))
            .SendAsync("ConversationChanged", new ConversationChangedPayload(conversationId));
        return true;
    }

    public async Task<ConversationResponse> UpdateGroupAsync(long currentUserId, long conversationId, UpdateGroupRequest request)
    {
        var conv = await _context.Conversations
            .Where(c => c.SysId == conversationId)
            .Include(c => c.Participants)
            .FirstOrDefaultAsync()
            ?? throw new KeyNotFoundException("Conversation not found");

        if (!conv.Participants.Any(p => p.UserSysId == currentUserId))
            throw new UnauthorizedAccessException("Not a participant of this conversation");

        if (conv.Type != "group")
            throw new ArgumentException("Only group conversations can be updated");

        if (request.Name != null)
            conv.Name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();

        if (request.AddUserIds != null && request.AddUserIds.Count > 0)
        {
            await ValidateUsersExistAsync(request.AddUserIds);
            var existingIds = conv.Participants.Select(p => p.UserSysId).ToHashSet();
            foreach (var uid in request.AddUserIds.Distinct().Where(id => !existingIds.Contains(id)))
                _context.ConversationParticipants.Add(new ConversationParticipant
                {
                    ConversationSysId = conversationId,
                    UserSysId = uid,
                });
        }

        if (request.RemoveUserIds != null && request.RemoveUserIds.Count > 0)
        {
            var toRemove = conv.Participants
                .Where(p => request.RemoveUserIds.Contains(p.UserSysId))
                .ToList();
            _context.ConversationParticipants.RemoveRange(toRemove);
        }

        await _context.SaveChangesAsync();

        await PushToParticipantsAsync(conversationId, "ConversationChanged", new ConversationChangedPayload(conversationId));
        return (await GetConversationAsync(conversationId, currentUserId))!;
    }

    public async Task<IEnumerable<MessagingUserResponse>> GetUsersAsync(long currentUserId)
    {
        return await _context.Users
            .Where(u => u.IsActive && u.SysId != currentUserId)
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
            .Select(u => new MessagingUserResponse(u.SysId, u.FirstName, u.LastName, u.Email))
            .ToListAsync();
    }

    public async Task<(string StoragePath, string MimeType, string OriginalFileName)?> GetAttachmentAsync(long attachmentId, long currentUserId)
    {
        var attachment = await _context.MessageAttachments
            .Include(a => a.Message)
            .FirstOrDefaultAsync(a => a.SysId == attachmentId);
        if (attachment == null) return null;

        if (!await IsParticipantAsync(attachment.Message.ConversationSysId, currentUserId))
            throw new UnauthorizedAccessException("Not a participant of this conversation");

        return (attachment.StoragePath, attachment.MimeType, attachment.OriginalFileName);
    }

    private async Task ValidateUsersExistAsync(IReadOnlyCollection<long> userIds)
    {
        var count = await _context.Users.CountAsync(u => userIds.Contains(u.SysId) && u.IsActive);
        if (count != userIds.Distinct().Count())
            throw new ArgumentException("One or more participant users do not exist");
    }

    private async Task<ConversationResponse> MapConversationAsync(Conversation conv, long currentUserId)
    {
        var myParticipant = conv.Participants.FirstOrDefault(p => p.UserSysId == currentUserId);
        var lastRead = myParticipant?.LastReadMessageSysId;
        var cleared = myParticipant?.ClearedAt;

        // Last message preview must respect "delete for me": only consider messages
        // newer than the user's clear point so a deleted-then-restarted chat doesn't
        // show the old preview.
        var lastMessageQuery = _context.Messages.Where(m => m.ConversationSysId == conv.SysId);
        if (cleared != null)
            lastMessageQuery = lastMessageQuery.Where(m => m.CreateTimestamp > cleared.Value);
        var lastMessage = await lastMessageQuery
            .OrderByDescending(m => m.SysId)
            .Include(m => m.Sender)
            .Include(m => m.Attachments)
            .Include(m => m.Reactions)
            .FirstOrDefaultAsync();

        var unread = await _context.Messages.CountAsync(m =>
            m.ConversationSysId == conv.SysId &&
            m.SenderSysId != currentUserId &&
            (lastRead == null || m.SysId > lastRead.Value) &&
            (cleared == null || m.CreateTimestamp > cleared.Value));

        var participants = conv.Participants
            .Select(p => new ParticipantResponse(
                p.UserSysId,
                p.User?.FirstName ?? "",
                p.User?.LastName ?? "",
                p.LastReadMessageSysId,
                p.User?.ProfilePhoto))
            .ToList();

        return new ConversationResponse(
            conv.SysId,
            conv.Type,
            conv.Name,
            participants,
            lastMessage == null ? null : MapMessage(lastMessage),
            unread,
            lastMessage?.CreateTimestamp ?? conv.CreateTimestamp);
    }

    private static MessageResponse MapMessage(Message m) => new(
        m.SysId,
        m.ConversationSysId,
        m.SenderSysId,
        m.Sender != null ? $"{m.Sender.FirstName} {m.Sender.LastName}".Trim() : "",
        m.Body,
        m.CreateTimestamp,
        m.Attachments.Select(a => new AttachmentResponse(a.SysId, a.OriginalFileName, a.MimeType, a.FileSize, a.Kind)).ToList(),
        m.Reactions.Select(r => new ReactionResponse(r.SysId, r.MessageSysId, r.UserSysId, r.Emoji)).ToList()
    );
}
