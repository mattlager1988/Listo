namespace Listo.Api.DTOs;

public record UserResponse(
    long SysId,
    string Email,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string Role,
    bool MfaEnabled,
    bool IsActive,
    DateTime? LastLoginAt,
    bool SidebarCollapsed,
    IReadOnlyList<string> Modules,
    string? PushoverKey,
    string? ProfilePhoto
);

public record CreateUserRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string Role,
    IReadOnlyList<string>? Modules,
    string? PushoverKey
);

public record UpdateUserRequest(
    string? Email,
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? Role,
    bool? IsActive,
    IReadOnlyList<string>? Modules,
    string? PushoverKey
);

public record UpdateProfileRequest(
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    bool? SidebarCollapsed,
    string? ProfilePhoto
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);

public record TestPushoverRequest(string? PushoverKey);
