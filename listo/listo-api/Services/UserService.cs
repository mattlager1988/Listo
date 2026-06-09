using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IUserService
{
    Task<IEnumerable<UserResponse>> GetAllUsersAsync();
    Task<IEnumerable<UserResponse>> GetInactiveUsersAsync();
    Task<UserResponse?> GetUserByIdAsync(long id);
    Task<UserResponse> CreateUserAsync(CreateUserRequest request);
    Task<UserResponse?> UpdateUserAsync(long id, UpdateUserRequest request);
    Task<bool> DeactivateUserAsync(long id);
    Task<UserResponse?> ReactivateUserAsync(long id);
    Task<UserResponse?> UpdateProfileAsync(long id, UpdateProfileRequest request);
    Task<bool> ChangePasswordAsync(long id, ChangePasswordRequest request);
    Task<bool> ResetMfaAsync(long userId);
}

public class UserService : IUserService
{
    private readonly ListoDbContext _context;
    private const int MinPasswordLength = 16;

    public UserService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<UserResponse>> GetAllUsersAsync()
    {
        var users = await _context.Users
            .Where(u => u.IsActive)
            .Include(u => u.Modules)
            .ToListAsync();
        return users.Select(MapToResponse);
    }

    public async Task<IEnumerable<UserResponse>> GetInactiveUsersAsync()
    {
        var users = await _context.Users
            .Where(u => !u.IsActive)
            .Include(u => u.Modules)
            .ToListAsync();
        return users.Select(MapToResponse);
    }

    public async Task<UserResponse?> GetUserByIdAsync(long id)
    {
        var user = await _context.Users
            .Include(u => u.Modules)
            .FirstOrDefaultAsync(u => u.SysId == id);
        return user == null ? null : MapToResponse(user);
    }

    public async Task<UserResponse> CreateUserAsync(CreateUserRequest request)
    {
        ValidatePassword(request.Password);

        if (await _context.Users.AnyAsync(u => u.Email == request.Email))
            throw new InvalidOperationException("Email already exists");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            FirstName = request.FirstName,
            LastName = request.LastName,
            PhoneNumber = request.PhoneNumber,
            Role = request.Role
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Non-admin users get exactly the modules requested; admins implicitly have all.
        if (user.Role != "admin")
            SyncModules(user, request.Modules ?? Array.Empty<string>());
        await _context.SaveChangesAsync();

        return MapToResponse(user);
    }

    public async Task<UserResponse?> UpdateUserAsync(long id, UpdateUserRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Modules)
            .FirstOrDefaultAsync(u => u.SysId == id);
        if (user == null) return null;

        if (request.Email != null)
        {
            if (await _context.Users.AnyAsync(u => u.Email == request.Email && u.SysId != id))
                throw new InvalidOperationException("Email already exists");
            user.Email = request.Email;
        }

        if (request.FirstName != null) user.FirstName = request.FirstName;
        if (request.LastName != null) user.LastName = request.LastName;
        if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber;
        if (request.Role != null) user.Role = request.Role;
        if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;

        // Module changes only apply to non-admins; admins implicitly have all modules.
        if (user.Role == "admin")
        {
            if (user.Modules.Count > 0)
                _context.UserModules.RemoveRange(user.Modules);
        }
        else if (request.Modules != null)
        {
            SyncModules(user, request.Modules);
        }

        await _context.SaveChangesAsync();
        return MapToResponse(user);
    }

    private void SyncModules(User user, IReadOnlyList<string> requested)
    {
        var desired = requested
            .Where(ModuleKeys.IsAssignable)
            .Select(k => k.ToLowerInvariant())
            .Distinct()
            .ToHashSet();

        var invalid = requested.Where(k => !ModuleKeys.IsAssignable(k)).ToList();
        if (invalid.Count > 0)
            throw new ArgumentException($"Invalid module key(s): {string.Join(", ", invalid)}");

        var current = user.Modules.ToList();

        foreach (var existing in current.Where(m => !desired.Contains(m.ModuleKey.ToLowerInvariant())))
            _context.UserModules.Remove(existing);

        var currentKeys = current.Select(m => m.ModuleKey.ToLowerInvariant()).ToHashSet();
        foreach (var key in desired.Where(k => !currentKeys.Contains(k)))
            user.Modules.Add(new UserModule { UserSysId = user.SysId, ModuleKey = key });
    }

    public async Task<bool> DeactivateUserAsync(long id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        user.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<UserResponse?> ReactivateUserAsync(long id)
    {
        var user = await _context.Users
            .Include(u => u.Modules)
            .FirstOrDefaultAsync(u => u.SysId == id);
        if (user == null) return null;

        user.IsActive = true;
        await _context.SaveChangesAsync();
        return MapToResponse(user);
    }

    public async Task<UserResponse?> UpdateProfileAsync(long id, UpdateProfileRequest request)
    {
        var user = await _context.Users
            .Include(u => u.Modules)
            .FirstOrDefaultAsync(u => u.SysId == id);
        if (user == null) return null;

        if (request.FirstName != null) user.FirstName = request.FirstName;
        if (request.LastName != null) user.LastName = request.LastName;
        if (request.PhoneNumber != null) user.PhoneNumber = request.PhoneNumber;
        if (request.SidebarCollapsed.HasValue) user.SidebarCollapsed = request.SidebarCollapsed.Value;

        await _context.SaveChangesAsync();
        return MapToResponse(user);
    }

    public async Task<bool> ChangePasswordAsync(long id, ChangePasswordRequest request)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect");

        ValidatePassword(request.NewPassword);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ResetMfaAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        user.MfaEnabled = false;
        user.MfaSecret = null;
        await _context.SaveChangesAsync();
        return true;
    }

    private static void ValidatePassword(string password)
    {
        if (string.IsNullOrEmpty(password) || password.Length < MinPasswordLength)
            throw new ArgumentException($"Password must be at least {MinPasswordLength} characters");
    }

    private static UserResponse MapToResponse(User user)
    {
        // Admins implicitly have all assignable modules; everyone else gets their grants.
        var modules = user.Role == "admin"
            ? ModuleKeys.Assignable.ToList()
            : user.Modules.Select(m => m.ModuleKey).ToList();

        return new(
            user.SysId,
            user.Email,
            user.FirstName,
            user.LastName,
            user.PhoneNumber,
            user.Role,
            user.MfaEnabled,
            user.IsActive,
            user.LastLoginAt,
            user.SidebarCollapsed,
            modules
        );
    }
}
