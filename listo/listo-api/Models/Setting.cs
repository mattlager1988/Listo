namespace Listo.Api.Models;

public class Setting : BaseEntity
{
    public required string Key { get; set; }
    public string? Value { get; set; }
    public required string Category { get; set; }
    public required string DisplayName { get; set; }
    public string? Description { get; set; }
    public required string ValueType { get; set; } // string, int, bool, json
    public bool IsSensitive { get; set; }
    public int SortOrder { get; set; }
}
