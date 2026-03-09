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
    bool SidebarCollapsed
);

public record CreateUserRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string Role
);

public record UpdateUserRequest(
    string? Email,
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    string? Role,
    bool? IsActive
);

public record UpdateProfileRequest(
    string? FirstName,
    string? LastName,
    string? PhoneNumber,
    bool? SidebarCollapsed
);

public record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);
