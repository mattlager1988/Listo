using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.Models;

namespace Listo.Api.Services;

/// <summary>
/// Periodically sends a Pushover notification to users who have a messaging
/// message that has been unread past the configured threshold (default 15 min)
/// and haven't already been notified for that unread batch. One generic
/// notification per user per batch.
/// </summary>
public class UnreadNotificationService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromMinutes(3);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<UnreadNotificationService> _logger;

    public UnreadNotificationService(IServiceScopeFactory scopeFactory, ILogger<UnreadNotificationService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Let the app finish starting before the first run.
        try { await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken); } catch { }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unread notification run failed");
            }
            try { await Task.Delay(Interval, stoppingToken); } catch { }
        }
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ListoDbContext>();
        var settings = scope.ServiceProvider.GetRequiredService<ISettingsService>();
        var pushover = scope.ServiceProvider.GetRequiredService<IPushoverService>();

        // Notifications are "enabled" when an application token is configured.
        var token = await settings.GetValueAsync("Pushover:ApiToken");
        if (string.IsNullOrWhiteSpace(token))
            return;

        var minutes = await settings.GetIntValueAsync("Pushover:UnreadMinutes", 15);
        var threshold = DateTime.UtcNow.AddMinutes(-minutes);

        var participants = await db.ConversationParticipants
            .Include(p => p.User).ThenInclude(u => u.Modules)
            .Where(p => p.User.IsActive && p.User.PushoverKey != null && p.User.PushoverKey != "")
            .ToListAsync(ct);

        // (participant, highest unread sysId) for conversations that qualify.
        var candidates = new List<(ConversationParticipant Participant, long MaxUnread)>();

        foreach (var p in participants)
        {
            var hasMessaging = p.User.Role == "admin"
                || p.User.Modules.Any(m => m.ModuleKey == ModuleKeys.Messaging);
            if (!hasMessaging) continue;

            var lastRead = p.LastReadMessageSysId ?? 0;
            var lastNotified = p.LastNotifiedMessageSysId ?? 0;
            var cleared = p.ClearedAt;

            var unread = db.Messages.Where(m =>
                m.ConversationSysId == p.ConversationSysId &&
                m.SenderSysId != p.UserSysId &&
                m.SysId > lastRead &&
                (cleared == null || m.CreateTimestamp > cleared.Value));

            var maxUnread = await unread.MaxAsync(m => (long?)m.SysId, ct) ?? 0;
            if (maxUnread <= lastNotified) continue; // already notified for everything unread

            var oldestUnread = await unread.MinAsync(m => (DateTime?)m.CreateTimestamp, ct);
            if (oldestUnread == null || oldestUnread.Value > threshold) continue; // not aged past threshold

            candidates.Add((p, maxUnread));
        }

        if (candidates.Count == 0)
            return;

        // One notification per user; stamp the markers only on a successful send.
        foreach (var group in candidates.GroupBy(c => c.Participant.UserSysId))
        {
            var key = group.First().Participant.User.PushoverKey!;
            var ok = await pushover.SendAsync(key, "You have unread messages in Listo.", "Listo", ct);
            if (!ok) continue;

            foreach (var (participant, maxUnread) in group)
                participant.LastNotifiedMessageSysId = maxUnread;
        }

        await db.SaveChangesAsync(ct);
    }
}
