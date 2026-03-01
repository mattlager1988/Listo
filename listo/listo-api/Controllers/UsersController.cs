using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAuthService _authService;

    public UsersController(IUserService userService, IAuthService authService)
    {
        _userService = userService;
        _authService = authService;
    }

    [HttpGet]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<IEnumerable<UserResponse>>> GetAll()
    {
        var users = await _userService.GetAllUsersAsync();
        return Ok(users);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<UserResponse>> GetById(long id)
    {
        var user = await _userService.GetUserByIdAsync(id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<UserResponse>> Create([FromBody] CreateUserRequest request)
    {
        try
        {
            var user = await _userService.CreateUserAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = user.SysId }, user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<UserResponse>> Update(long id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var user = await _userService.UpdateUserAsync(id, request);
            if (user == null) return NotFound();
            return Ok(user);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await _userService.DeleteUserAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/reset-mfa")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ResetMfa(long id)
    {
        var success = await _authService.DisableMfaAsync(id);
        if (!success) return NotFound();
        return Ok(new { message = "MFA has been reset" });
    }

    // Profile endpoints (for current user)
    [HttpGet("me")]
    public async Task<ActionResult<UserResponse>> GetProfile()
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _userService.GetUserByIdAsync(userId);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPut("me")]
    public async Task<ActionResult<UserResponse>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var user = await _userService.UpdateProfileAsync(userId, request);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            await _userService.ChangePasswordAsync(userId, request);
            return Ok(new { message = "Password changed successfully" });
        }
        catch (UnauthorizedAccessException)
        {
            return BadRequest(new { message = "Current password is incorrect" });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
