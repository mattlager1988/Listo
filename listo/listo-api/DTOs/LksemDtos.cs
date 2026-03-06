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

// Payment Method DTOs
public record PaymentMethodResponse(
    long SysId,
    string Name,
    bool IsDeleted,
    int PaymentCount
);

public record CreatePaymentMethodRequest(string Name);
public record UpdatePaymentMethodRequest(string? Name);

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
    DateTime? DiscontinuedDate,
    DateTime? LastPaymentDate
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

// Payment DTOs
public record PaymentResponse(
    long SysId,
    long AccountSysId,
    string AccountName,
    long PaymentMethodSysId,
    string PaymentMethodName,
    decimal Amount,
    string? Description,
    string? ConfirmationNumber,
    string Status,
    DateTime? CompletedDate,
    DateTime CreateTimestamp,
    long? BankAccountSysId,
    string? BankAccountName
);

public record CreatePaymentRequest(
    long AccountSysId,
    long PaymentMethodSysId,
    decimal Amount,
    string? Description,
    string? ConfirmationNumber,
    long? BankAccountSysId
);

public record UpdatePaymentRequest(
    long? PaymentMethodSysId,
    string? Description,
    string? ConfirmationNumber
);

public record PaymentSummaryResponse(
    int Year,
    int Month,
    decimal TotalAmount
);

// Bank Account DTOs
public record BankAccountResponse(
    long SysId,
    string Name,
    string AccountType,
    string? AccountNumber,
    string? RoutingNumber,
    decimal Balance,
    string? Color,
    bool IsDiscontinued,
    DateTime? DiscontinuedDate
);

public record CreateBankAccountRequest(
    string Name,
    string AccountType,
    string? AccountNumber,
    string? RoutingNumber,
    decimal Balance,
    string? Color
);

public record UpdateBankAccountRequest(
    string? Name,
    string? AccountType,
    string? AccountNumber,
    string? RoutingNumber,
    decimal? Balance,
    string? Color
);

// Ledger Transaction DTOs
public record LedgerTransactionResponse(
    long SysId,
    long BankAccountSysId,
    string BankAccountName,
    string TransactionType,
    decimal Amount,
    string? Description,
    long? PaymentSysId,
    string? PaymentAccountName,
    DateTime CreateTimestamp
);

public record CreateLedgerTransactionRequest(
    long BankAccountSysId,
    string TransactionType,
    decimal Amount,
    string? Description
);
