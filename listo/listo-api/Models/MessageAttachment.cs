namespace Listo.Api.Models;

public class MessageAttachment : BaseEntity
{
    public long MessageSysId { get; set; }

    // GUID filename on disk; original name preserved separately (mirrors Document).
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string StoragePath { get; set; } = string.Empty;

    // "image" or "video"
    public string Kind { get; set; } = string.Empty;

    public Message Message { get; set; } = null!;
}
