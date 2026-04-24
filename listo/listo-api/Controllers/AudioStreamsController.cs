using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class AudioStreamsController : ControllerBase
{
    private readonly IAudioStreamService _service;

    public AudioStreamsController(IAudioStreamService service)
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

        var streams = await _service.GetAllAsync(userId.Value);
        return Ok(streams);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var stream = await _service.GetByIdAsync(id, userId.Value);
        if (stream == null) return NotFound();
        return Ok(stream);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAudioStreamRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var stream = await _service.CreateAsync(request, userId.Value);
        return CreatedAtAction(nameof(GetById), new { id = stream.SysId }, stream);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateAudioStreamRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var stream = await _service.UpdateAsync(id, request, userId.Value);
        if (stream == null) return NotFound();
        return Ok(stream);
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
}
