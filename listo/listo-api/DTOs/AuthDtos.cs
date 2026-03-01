namespace Listo.Api.DTOs;

public record LoginRequest(string Email, string Password);
public record LoginResponse(bool RequiresMfa, string? MfaToken, TokenResponse? Tokens);
public record MfaVerifyRequest(string MfaToken, string Code);
public record TokenResponse(string AccessToken, string RefreshToken, DateTime ExpiresAt);
public record RefreshRequest(string RefreshToken);
public record MfaSetupResponse(string Secret, string QrCodeBase64, string ManualEntryKey);
public record MfaEnableRequest(string Code);
