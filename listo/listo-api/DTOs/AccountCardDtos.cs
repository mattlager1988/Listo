namespace Listo.Api.DTOs;

public record AccountCardResponse(
    long SysId,
    long AccountSysId,
    string Name,
    string? CardNumber,      // Decrypted, masked for display (last 4 digits)
    string? CardNumberFull,  // Decrypted, full number for copy
    string? ExpirationDate,
    string? Cvv,             // Decrypted
    string? PhoneNumber,
    bool HasFrontImage,
    bool HasBackImage,
    DateTime CreateTimestamp
);

public record CreateAccountCardRequest(
    long AccountSysId,
    string Name,
    string? CardNumber,
    string? ExpirationDate,
    string? Cvv,
    string? PhoneNumber
);

public record UpdateAccountCardRequest(
    string? Name,
    string? CardNumber,
    string? ExpirationDate,
    string? Cvv,
    string? PhoneNumber
);

public record AccountCardWithAccountResponse(
    long SysId,
    long AccountSysId,
    string AccountName,
    string Name,
    string? CardNumber,
    string? CardNumberFull,
    string? ExpirationDate,
    string? Cvv,
    string? PhoneNumber,
    bool HasFrontImage,
    bool HasBackImage,
    DateTime CreateTimestamp
);
