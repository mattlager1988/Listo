using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class NotesController : ControllerBase
{
    private readonly INoteService _service;

    public NotesController(INoteService service)
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

        var notes = await _service.GetAllAsync(userId.Value);
        return Ok(notes);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var note = await _service.GetByIdAsync(id, userId.Value);
        if (note == null) return NotFound();
        return Ok(note);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateNoteRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var note = await _service.CreateAsync(request, userId.Value);
        return CreatedAtAction(nameof(GetById), new { id = note.SysId }, note);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateNoteRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var note = await _service.UpdateAsync(id, request, userId.Value);
        if (note == null) return NotFound();
        return Ok(note);
    }

    [HttpGet("discontinued")]
    public async Task<IActionResult> GetDiscontinued()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var notes = await _service.GetDiscontinuedAsync(userId.Value);
        return Ok(notes);
    }

    [HttpPost("{id}/discontinue")]
    public async Task<IActionResult> Discontinue(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var success = await _service.DiscontinueAsync(id, userId.Value);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public async Task<IActionResult> Reactivate(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var note = await _service.ReactivateAsync(id, userId.Value);
        if (note == null) return NotFound();
        return Ok(note);
    }
}
