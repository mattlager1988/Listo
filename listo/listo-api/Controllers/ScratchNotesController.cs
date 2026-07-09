using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/tasks/scratchnotes")]
[Authorize]
[Listo.Api.Authorization.ModuleAccess(Listo.Api.Models.ModuleKeys.Tasks)]
public class ScratchNotesController : ControllerBase
{
    private readonly IScratchNoteService _scratchNoteService;

    public ScratchNotesController(IScratchNoteService scratchNoteService)
    {
        _scratchNoteService = scratchNoteService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ScratchNoteResponse>>> GetAll()
    {
        return Ok(await _scratchNoteService.GetAllAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ScratchNoteResponse>> GetById(long id)
    {
        var note = await _scratchNoteService.GetByIdAsync(id);
        if (note == null) return NotFound();
        return Ok(note);
    }

    [HttpPost]
    public async Task<ActionResult<ScratchNoteResponse>> Create([FromBody] CreateScratchNoteRequest request)
    {
        var note = await _scratchNoteService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = note.SysId }, note);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ScratchNoteResponse>> Update(long id, [FromBody] UpdateScratchNoteRequest request)
    {
        var note = await _scratchNoteService.UpdateAsync(id, request);
        if (note == null) return NotFound();
        return Ok(note);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _scratchNoteService.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/convert")]
    public async Task<ActionResult<ScratchNoteResponse>> Convert(long id, [FromBody] ConvertScratchNoteRequest request)
    {
        try
        {
            var note = await _scratchNoteService.ConvertAsync(id, request);
            if (note == null) return NotFound();
            return Ok(note);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
