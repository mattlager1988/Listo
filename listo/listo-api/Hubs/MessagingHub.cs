using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Listo.Api.Models;
using Listo.Api.Services;

namespace Listo.Api.Hubs;

/// <summary>
/// Real-time messaging hub. Each connection joins a per-user group ("user-{id}")
/// so the server can push to a user across all their devices without managing
/// per-conversation group membership dynamically.
/// </summary>
[Authorize]
public class MessagingHub : Hub
{
    private readonly IMessagingService _messaging;
    private readonly IPresenceTracker _presence;

    public MessagingHub(IMessagingService messaging, IPresenceTracker presence)
    {
        _messaging = messaging;
        _presence = presence;
    }

    private long? UserId
    {
        get
        {
            var claim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? Context.User?.FindFirst("sub")?.Value;
            return long.TryParse(claim, out var id) ? id : null;
        }
    }

    private bool HasMessagingAccess()
    {
        var user = Context.User;
        if (user == null) return false;
        if (user.IsInRole("admin")) return true;
        return user.Claims.Any(c => c.Type == "module" &&
            string.Equals(c.Value, ModuleKeys.Messaging, StringComparison.OrdinalIgnoreCase));
    }

    public static string UserGroup(long userId) => $"user-{userId}";

    public override async Task OnConnectedAsync()
    {
        var userId = UserId;
        if (userId == null || !HasMessagingAccess())
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(userId.Value));

        if (_presence.Connect(userId.Value, Context.ConnectionId))
            await Clients.Others.SendAsync("PresenceChanged", userId.Value, true);

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = UserId;
        if (userId != null)
        {
            if (_presence.Disconnect(userId.Value, Context.ConnectionId))
                await Clients.Others.SendAsync("PresenceChanged", userId.Value, false);
        }
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>Broadcast a typing indicator to the other participants of a conversation.</summary>
    public async Task Typing(long conversationId, bool isTyping)
    {
        var userId = UserId;
        if (userId == null) return;
        if (!await _messaging.IsParticipantAsync(conversationId, userId.Value)) return;

        var participantIds = await _messaging.GetParticipantUserIdsAsync(conversationId);
        var targets = participantIds.Where(id => id != userId.Value).Select(UserGroup).ToList();
        if (targets.Count > 0)
            await Clients.Groups(targets).SendAsync("TypingChanged", conversationId, userId.Value, isTyping);
    }
}
