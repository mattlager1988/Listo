namespace Listo.Api.DTOs;

public record PeriodLogResponse(
    long SysId,
    DateTime StartDate,
    int PainSeverity,
    int Mood,
    string? Notes,
    DateTime CreateTimestamp,
    DateTime ModifyTimestamp
);

public record CreatePeriodLogRequest(DateTime StartDate, int PainSeverity, int Mood, string? Notes);

public record UpdatePeriodLogRequest(DateTime? StartDate, int? PainSeverity, int? Mood, string? Notes);

public record PeriodStatsResponse(
    DateTime? LastPeriodDate,
    DateTime? NextEstimatedDate,
    double? AverageCycleDays,
    int CycleCount
);
