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
    long? ImageDocumentSysId,
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
