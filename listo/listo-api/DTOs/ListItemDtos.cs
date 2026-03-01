namespace Listo.Api.DTOs;

// Generic response for list items (Type, Owner)
public record ListItemResponse(
    long SysId,
    string Name,
    string? Description,
    bool IsActive,
    int SortOrder
);

// Create request
public record CreateListItemRequest(
    string Name,
    string? Description,
    bool IsActive = true,
    int SortOrder = 0
);

// Update request
public record UpdateListItemRequest(
    string? Name,
    string? Description,
    bool? IsActive,
    int? SortOrder
);
