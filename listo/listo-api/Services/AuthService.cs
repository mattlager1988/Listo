using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using OtpNet;
using QRCoder;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request);
    Task<TokenResponse> VerifyMfaAsync(MfaVerifyRequest request);
    Task<TokenResponse?> RefreshTokenAsync(string refreshToken);
    Task RevokeRefreshTokenAsync(string refreshToken);
    Task<MfaSetupResponse> SetupMfaAsync(long userId);
    Task<bool> EnableMfaAsync(long userId, string code);
    Task<bool> DisableMfaAsync(long userId);
}

public class AuthService : IAuthService
{
    private readonly ListoDbContext _context;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthService> _logger;

    public AuthService(ListoDbContext context, IConfiguration config, ILogger<AuthService> logger)
    {
        _context = context;
        _config = config;
        _logger = logger;
    }

    public async Task<LoginResponse> LoginAsync(LoginRequest request)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        if (user.MfaEnabled)
        {
            var mfaToken = GenerateMfaToken(user.SysId);
            return new LoginResponse(true, mfaToken, null);
        }

        var tokens = await GenerateTokensAsync(user);
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new LoginResponse(false, null, tokens);
    }

    public async Task<TokenResponse> VerifyMfaAsync(MfaVerifyRequest request)
    {
        var userId = ValidateMfaToken(request.MfaToken);
        var user = await _context.Users.FindAsync(userId)
            ?? throw new UnauthorizedAccessException("Invalid MFA token");

        if (string.IsNullOrEmpty(user.MfaSecret))
            throw new InvalidOperationException("MFA not configured");

        var totp = new Totp(Base32Encoding.ToBytes(user.MfaSecret));
        if (!totp.VerifyTotp(request.Code, out _, new VerificationWindow(1, 1)))
        {
            throw new UnauthorizedAccessException("Invalid MFA code");
        }

        var tokens = await GenerateTokensAsync(user);
        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return tokens;
    }

    public async Task<TokenResponse?> RefreshTokenAsync(string refreshToken)
    {
        var token = await _context.RefreshTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == refreshToken && !t.Revoked);

        if (token == null || token.ExpiresAt < DateTime.UtcNow || !token.User.IsActive)
            return null;

        token.Revoked = true;
        var newTokens = await GenerateTokensAsync(token.User);
        await _context.SaveChangesAsync();

        return newTokens;
    }

    public async Task RevokeRefreshTokenAsync(string refreshToken)
    {
        var token = await _context.RefreshTokens
            .FirstOrDefaultAsync(t => t.Token == refreshToken);

        if (token != null)
        {
            token.Revoked = true;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<MfaSetupResponse> SetupMfaAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("User not found");

        var secret = Base32Encoding.ToString(KeyGeneration.GenerateRandomKey(20));
        user.MfaSecret = secret;
        await _context.SaveChangesAsync();

        var issuer = "Listo";
        var otpUri = $"otpauth://totp/{issuer}:{user.Email}?secret={secret}&issuer={issuer}";

        using var qrGenerator = new QRCodeGenerator();
        var qrCodeData = qrGenerator.CreateQrCode(otpUri, QRCodeGenerator.ECCLevel.Q);
        var qrCode = new PngByteQRCode(qrCodeData);
        var qrCodeBytes = qrCode.GetGraphic(20);
        var qrCodeBase64 = Convert.ToBase64String(qrCodeBytes);

        return new MfaSetupResponse(secret, qrCodeBase64, secret);
    }

    public async Task<bool> EnableMfaAsync(long userId, string code)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("User not found");

        if (string.IsNullOrEmpty(user.MfaSecret))
            throw new InvalidOperationException("MFA not set up");

        var totp = new Totp(Base32Encoding.ToBytes(user.MfaSecret));
        if (!totp.VerifyTotp(code, out _, new VerificationWindow(1, 1)))
            return false;

        user.MfaEnabled = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> DisableMfaAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("User not found");

        user.MfaEnabled = false;
        user.MfaSecret = null;
        await _context.SaveChangesAsync();
        return true;
    }

    private async Task<TokenResponse> GenerateTokensAsync(User user)
    {
        var accessToken = GenerateAccessToken(user);
        var refreshToken = GenerateRefreshToken();
        var expirationDays = _config.GetValue<int>("Jwt:RefreshTokenExpirationDays");

        var refreshTokenEntity = new RefreshToken
        {
            UsersSysId = user.SysId,
            Token = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddDays(expirationDays)
        };

        _context.RefreshTokens.Add(refreshTokenEntity);
        await _context.SaveChangesAsync();

        var accessExpiration = DateTime.UtcNow.AddMinutes(
            _config.GetValue<int>("Jwt:AccessTokenExpirationMinutes"));

        return new TokenResponse(accessToken, refreshToken, accessExpiration);
    }

    private string GenerateAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("sub", user.SysId.ToString()),
            new Claim("email", user.Email),
            new Claim("role", user.Role),
            new Claim("firstName", user.FirstName),
            new Claim("lastName", user.LastName)
        };

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_config.GetValue<int>("Jwt:AccessTokenExpirationMinutes")),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    private string GenerateMfaToken(long userId)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: new[] { new Claim("mfa_user", userId.ToString()) },
            expires: DateTime.UtcNow.AddMinutes(5),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private long ValidateMfaToken(string token)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Secret"]!));

        var tokenHandler = new JwtSecurityTokenHandler();
        var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidIssuer = _config["Jwt:Issuer"],
            ValidAudience = _config["Jwt:Audience"],
            IssuerSigningKey = key
        }, out _);

        var userIdClaim = principal.FindFirst("mfa_user")?.Value
            ?? throw new UnauthorizedAccessException("Invalid MFA token");

        return long.Parse(userIdClaim);
    }
}
