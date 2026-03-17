using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/passwords/[controller]")]
[Authorize]
public class PasswordEntriesController : ControllerBase
{
    private readonly IPasswordEntryService _service;

    public PasswordEntriesController(IPasswordEntryService service)
    {
        _service = service;
    }

    private long? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var entries = await _service.GetAllAsync(userId.Value);
        return Ok(entries);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var entry = await _service.GetByIdAsync(id, userId.Value);
        if (entry == null) return NotFound();
        return Ok(entry);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePasswordEntryRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var entry = await _service.CreateAsync(request, userId.Value);
        return CreatedAtAction(nameof(GetById), new { id = entry.SysId }, entry);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdatePasswordEntryRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var entry = await _service.UpdateAsync(id, request, userId.Value);
        if (entry == null) return NotFound();
        return Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var success = await _service.DeleteAsync(id, userId.Value);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/favorite")]
    public async Task<IActionResult> ToggleFavorite(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var entry = await _service.ToggleFavoriteAsync(id, userId.Value);
        if (entry == null) return NotFound();
        return Ok(entry);
    }
}
