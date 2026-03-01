namespace Listo.Api.DTOs;

// Response DTO for grid and detail view
public record AccountResponse(
    long SysId,
    string Name,
    long AccountTypeSysId,
    string AccountTypeName,
    long AccountOwnerSysId,
    string AccountOwnerName,
    decimal? AmountDue,
    DateTime? DueDate,
    string? AccountNumber,
    string? PhoneNumber,
    string? WebAddress,
    string? Username,
    string? Password,  // Decrypted for display
    bool AutoPay,
    bool ResetAmountDue,
    string AccountFlag
);

// Create request
public record CreateAccountRequest(
    string Name,
    long AccountTypeSysId,
    long AccountOwnerSysId,
    decimal? AmountDue,
    DateTime? DueDate,
    string? AccountNumber,
    string? PhoneNumber,
    string? WebAddress,
    string? Username,
    string? Password,
    bool AutoPay,
    bool ResetAmountDue,
    string AccountFlag
);

// Update request (all nullable for partial updates)
public record UpdateAccountRequest(
    string? Name,
    long? AccountTypeSysId,
    long? AccountOwnerSysId,
    decimal? AmountDue,
    DateTime? DueDate,
    string? AccountNumber,
    string? PhoneNumber,
    string? WebAddress,
    string? Username,
    string? Password,
    bool? AutoPay,
    bool? ResetAmountDue,
    string? AccountFlag
);
