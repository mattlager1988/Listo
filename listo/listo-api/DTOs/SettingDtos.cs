namespace Listo.Api.DTOs;

public record SettingResponse(
    long SysId,
    string Key,
    string? Value,
    string Category,
    string DisplayName,
    string? Description,
    string ValueType,
    bool IsSensitive,
    int SortOrder
);

public record SettingCategoryResponse(
    string Category,
    IEnumerable<SettingResponse> Settings
);

public record UpdateSettingRequest(
    string Value
);

public record BulkUpdateSettingsRequest(
    Dictionary<string, string?> Settings
);
