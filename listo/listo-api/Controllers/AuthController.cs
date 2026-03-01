using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        try
        {
            var response = await _authService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { message = "Invalid credentials" });
        }
    }

    [HttpPost("mfa/verify")]
    public async Task<ActionResult<TokenResponse>> VerifyMfa([FromBody] MfaVerifyRequest request)
    {
        try
        {
            var response = await _authService.VerifyMfaAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { message = "Invalid MFA code" });
        }
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<TokenResponse>> Refresh([FromBody] RefreshRequest request)
    {
        var response = await _authService.RefreshTokenAsync(request.RefreshToken);
        if (response == null)
            return Unauthorized(new { message = "Invalid refresh token" });
        return Ok(response);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout([FromBody] RefreshRequest request)
    {
        await _authService.RevokeRefreshTokenAsync(request.RefreshToken);
        return NoContent();
    }

    [Authorize]
    [HttpGet("mfa/setup")]
    public async Task<ActionResult<MfaSetupResponse>> SetupMfa()
    {
        var userId = long.Parse(User.FindFirst("sub")!.Value);
        var response = await _authService.SetupMfaAsync(userId);
        return Ok(response);
    }

    [Authorize]
    [HttpPost("mfa/enable")]
    public async Task<IActionResult> EnableMfa([FromBody] MfaEnableRequest request)
    {
        var userId = long.Parse(User.FindFirst("sub")!.Value);
        var success = await _authService.EnableMfaAsync(userId, request.Code);
        if (!success)
            return BadRequest(new { message = "Invalid verification code" });
        return Ok(new { message = "MFA enabled successfully" });
    }
}
