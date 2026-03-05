namespace Listo.Api.Models;

public class Document : BaseEntity
{
    public string FileName { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public string StoragePath { get; set; } = string.Empty;

    // Module and entity this document is attached to
    public string Module { get; set; } = string.Empty;  // e.g., "aviation", "lksem"
    public string EntityType { get; set; } = string.Empty;  // e.g., "training_log", "account"
    public long? EntitySysId { get; set; }  // ID of the entity this is attached to

    // Document type (category)
    public long? DocumentTypeSysId { get; set; }
    public DocumentType? DocumentType { get; set; }

    // User who uploaded the document
    public long UploadedBySysId { get; set; }
    public User UploadedBy { get; set; } = null!;
}
