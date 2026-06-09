namespace Listo.Api.Models;

/// <summary>
/// Canonical set of access-controlled module keys. Mirror these values in the
/// frontend shared helper (listo/shared/utils/modules.ts).
/// </summary>
public static class ModuleKeys
{
    public const string Dashboard = "dashboard";
    public const string Finance = "finance";
    public const string Aviation = "aviation";
    public const string Passwords = "passwords";
    public const string Tasks = "tasks";
    public const string Messaging = "messaging";
    public const string Admin = "admin";

    /// <summary>
    /// Modules an admin can assign to a non-admin user. The "admin" module is
    /// role-driven (granted by Role == "admin"), so it is not assignable here.
    /// </summary>
    public static readonly string[] Assignable =
    {
        Dashboard, Finance, Aviation, Passwords, Tasks, Messaging
    };

    public static readonly HashSet<string> All =
        new(Assignable.Append(Admin), StringComparer.OrdinalIgnoreCase);

    public static bool IsAssignable(string key) =>
        Assignable.Contains(key, StringComparer.OrdinalIgnoreCase);
}
