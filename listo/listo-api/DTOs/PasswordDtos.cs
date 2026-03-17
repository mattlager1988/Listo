namespace Listo.Api.DTOs;

// Password Category DTOs
public record PasswordCategoryResponse(
    long SysId,
    string Name,
    bool IsDeleted,
    int PasswordEntryCount
);

public record CreatePasswordCategoryRequest(string Name);
public record UpdatePasswordCategoryRequest(string? Name);

// Password Entry DTOs
public record PasswordEntryResponse(
    long SysId,
    string Title,
    string? Url,
    string? Username,
    string? Password,
    string? Notes,
    bool IsFavorite,
    long? CategorySysId,
    string? CategoryName,
    DateTime CreateTimestamp,
    DateTime ModifyTimestamp
);

public record CreatePasswordEntryRequest(
    string Title,
    string? Url,
    string? Username,
    string? Password,
    string? Notes,
    bool IsFavorite,
    long? CategorySysId
);

public record UpdatePasswordEntryRequest(
    string? Title,
    string? Url,
    string? Username,
    string? Password,
    string? Notes,
    bool? IsFavorite,
    long? CategorySysId
);
