using System.Collections.Concurrent;

namespace Listo.Api.Services;

public interface IPresenceTracker
{
    /// <summary>Returns true if the user just came online (first connection).</summary>
    bool Connect(long userId, string connectionId);
    /// <summary>Returns true if the user is now fully offline (no connections left).</summary>
    bool Disconnect(long userId, string connectionId);
    bool IsOnline(long userId);
    IReadOnlyCollection<long> OnlineUsers();
}

public class PresenceTracker : IPresenceTracker
{
    private readonly ConcurrentDictionary<long, HashSet<string>> _connections = new();

    public bool Connect(long userId, string connectionId)
    {
        var isNew = false;
        lock (_connections)
        {
            if (!_connections.TryGetValue(userId, out var set))
            {
                set = new HashSet<string>();
                _connections[userId] = set;
                isNew = true;
            }
            set.Add(connectionId);
        }
        return isNew;
    }

    public bool Disconnect(long userId, string connectionId)
    {
        lock (_connections)
        {
            if (!_connections.TryGetValue(userId, out var set))
                return false;
            set.Remove(connectionId);
            if (set.Count == 0)
            {
                _connections.TryRemove(userId, out _);
                return true;
            }
            return false;
        }
    }

    public bool IsOnline(long userId) => _connections.ContainsKey(userId);

    public IReadOnlyCollection<long> OnlineUsers() => _connections.Keys.ToList();
}
