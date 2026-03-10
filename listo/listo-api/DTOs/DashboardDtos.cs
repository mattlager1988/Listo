namespace Listo.Api.DTOs;

public record DashboardSummaryResponse(
    // Bank Accounts
    IEnumerable<BankAccountSummaryDto> BankAccounts,

    // Current Cycle Plan (if any Active)
    CyclePlanSummaryDto? ActiveCyclePlan,

    // Upcoming Bills (next 14 days)
    IEnumerable<UpcomingBillDto> UpcomingBills,

    // Aviation Summary
    AviationSummaryDto? AviationStats
);

public record BankAccountSummaryDto(
    long SysId,
    string Name,
    string AccountType,
    decimal Balance,
    string? Color
);

public record CyclePlanSummaryDto(
    long SysId,
    DateTime StartDate,
    DateTime EndDate,
    string CycleGoalName,
    decimal AmountIn,
    decimal AmountOut,
    decimal Balance,
    int DaysRemaining,
    decimal TotalCredits,
    decimal TotalDebits
);

public record UpcomingBillDto(
    long SysId,
    string AccountName,
    decimal AmountDue,
    DateTime DueDate,
    bool AutoPay,
    string AccountFlag
);

public record AviationSummaryDto(
    decimal TotalDualHours,
    decimal TotalSoloHours,
    DateTime? LastTrainingDate,
    IEnumerable<TrainingTypeHoursDto> HoursByTypeLast30Days
);

public record TrainingTypeHoursDto(
    string TrainingType,
    decimal Hours
);
