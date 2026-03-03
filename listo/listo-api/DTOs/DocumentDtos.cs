namespace Listo.Api.DTOs;

public record DocumentResponse(
    long SysId,
    string FileName,
    string OriginalFileName,
    string Description,
    string MimeType,
    long FileSize,
    string Module,
    string EntityType,
    long? EntitySysId,
    long? DocumentTypeSysId,
    string? DocumentTypeName,
    long UploadedBySysId,
    string UploadedByName,
    DateTime CreateTimestamp
);

public record CreateDocumentRequest(
    string Description,
    string Module,
    string EntityType,
    long? EntitySysId,
    long? DocumentTypeSysId
);

public record UpdateDocumentRequest(
    string? Description,
    long? DocumentTypeSysId
);
