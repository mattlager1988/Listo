namespace Listo.Api.DTOs;

public record PeriodLogResponse(
    long SysId,
    DateTime StartDate,
    DateTime? PreWeekStartDate,
    bool IsStartDateEstimated,
    string? Notes,
    IReadOnlyList<PeriodLogEntryResponse> Entries,
    DateTime CreateTimestamp,
    DateTime ModifyTimestamp
);

public record CreatePeriodLogRequest(
    DateTime StartDate,
    DateTime? PreWeekStartDate,
    bool IsStartDateEstimated,
    string? Notes
);

public record UpdatePeriodLogRequest(
    DateTime? StartDate,
    DateTime? PreWeekStartDate,
    bool? IsStartDateEstimated,
    string? Notes
);

public record PeriodStatsResponse(
    DateTime? LastPeriodDate,
    DateTime? NextEstimatedDate,
    double? AverageCycleDays,
    int CycleCount
);

// Log records ("entries") within a period.
public record PeriodLogEntryResponse(
    long SysId,
    long PeriodLogSysId,
    long EntryTypeSysId,
    string EntryTypeName,
    DateTime EntryDate,
    string? Notes,
    DateTime CreateTimestamp,
    DateTime ModifyTimestamp
);

public record CreatePeriodLogEntryRequest(
    long PeriodLogSysId,
    long EntryTypeSysId,
    DateTime EntryDate,
    string? Notes
);

public record UpdatePeriodLogEntryRequest(
    long? EntryTypeSysId,
    DateTime? EntryDate,
    string? Notes
);

// Admin-managed lookup list for log record types.
public record PeriodLogEntryTypeResponse(long SysId, string Name, bool IsDeleted, int EntryCount);

public record CreatePeriodLogEntryTypeRequest(string Name);

public record UpdatePeriodLogEntryTypeRequest(string? Name);
