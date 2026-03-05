namespace Listo.Api.DTOs;

// Account Type DTOs
public record AccountTypeResponse(
    long SysId,
    string Name,
    bool IsDeleted,
    int AccountCount
);

public record CreateAccountTypeRequest(string Name);
public record UpdateAccountTypeRequest(string? Name);

// Account Owner DTOs
public record AccountOwnerResponse(
    long SysId,
    string Name,
    bool IsDeleted,
    int AccountCount
);

public record CreateAccountOwnerRequest(string Name);
public record UpdateAccountOwnerRequest(string? Name);

// Account DTOs
public record AccountResponse(
    long SysId,
    string Name,
    long AccountTypeSysId,
    string AccountTypeName,
    long AccountOwnerSysId,
    string AccountOwnerName,
    decimal AmountDue,
    DateTime? DueDate,
    string? AccountNumber,
    string? PhoneNumber,
    string? WebAddress,
    string? Username,
    string? Password, // Decrypted for display
    bool AutoPay,
    bool ResetAmountDue,
    string AccountFlag,
    string? Notes,
    bool IsDiscontinued,
    DateTime? DiscontinuedDate
);

public record CreateAccountRequest(
    string Name,
    long AccountTypeSysId,
    long AccountOwnerSysId,
    decimal AmountDue,
    DateTime? DueDate,
    string? AccountNumber,
    string? PhoneNumber,
    string? WebAddress,
    string? Username,
    string? Password,
    bool AutoPay,
    bool ResetAmountDue,
    string AccountFlag,
    string? Notes
);

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
    string? AccountFlag,
    string? Notes
);

// Saved View DTOs
public record SavedViewResponse(
    long SysId,
    string Name,
    string ViewType,
    string Configuration,
    bool IsDefault
);

public record CreateSavedViewRequest(
    string Name,
    string ViewType,
    string Configuration,
    bool IsDefault
);

public record UpdateSavedViewRequest(
    string? Name,
    string? Configuration,
    bool? IsDefault
);
