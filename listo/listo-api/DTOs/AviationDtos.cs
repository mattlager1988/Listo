namespace Listo.Api.DTOs;

// Document Type DTOs
public record DocumentTypeResponse(
    long SysId,
    string Name,
    bool IsDeleted,
    int DocumentCount
);

public record CreateDocumentTypeRequest(string Name);

public record UpdateDocumentTypeRequest(string? Name);

// Training Type DTOs
public record TrainingTypeResponse(
    long SysId,
    string Name,
    bool IsDeleted,
    int TrainingLogCount
);

public record CreateTrainingTypeRequest(string Name);

public record UpdateTrainingTypeRequest(string? Name);

// Aircraft DTOs
public record AircraftResponse(
    long SysId,
    string PlaneId,
    string Name,
    bool IsDeleted,
    int TrainingLogCount
);

public record CreateAircraftRequest(string PlaneId, string Name);

public record UpdateAircraftRequest(string? PlaneId, string? Name);

// Training Log DTOs
public record TrainingLogResponse(
    long SysId,
    DateTime Date,
    string Description,
    decimal HoursFlown,
    long TrainingTypeSysId,
    string TrainingTypeName,
    long? AircraftSysId,
    string? AircraftPlaneId,
    string? AircraftName,
    DateTime CreateTimestamp,
    DateTime ModifyTimestamp
);

public record CreateTrainingLogRequest(
    DateTime Date,
    string Description,
    decimal HoursFlown,
    long TrainingTypeSysId,
    long? AircraftSysId
);

public record UpdateTrainingLogRequest(
    DateTime? Date,
    string? Description,
    decimal? HoursFlown,
    long? TrainingTypeSysId,
    long? AircraftSysId
);

public record TrainingLogSummary(
    decimal TotalHours,
    int TotalEntries,
    Dictionary<string, decimal> HoursByType
);

// Note DTOs
public record NoteResponse(
    long SysId,
    string Subject,
    string Description,
    DateTime CreateTimestamp,
    DateTime ModifyTimestamp
);

public record CreateNoteRequest(string Subject, string Description);

public record UpdateNoteRequest(string? Subject, string? Description);
