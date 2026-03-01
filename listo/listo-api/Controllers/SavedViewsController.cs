using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/lksem/[controller]")]
[Authorize]
public class SavedViewsController : ControllerBase
{
    private readonly ISavedViewService _service;

    public SavedViewsController(ISavedViewService service)
    {
        _service = service;
    }

    private long GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return long.Parse(userIdClaim!);
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<SavedViewResponse>>> GetAll([FromQuery] string viewType)
    {
        var views = await _service.GetAllForUserAsync(GetCurrentUserId(), viewType);
        return Ok(views);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<SavedViewResponse>> GetById(long id)
    {
        var view = await _service.GetByIdAsync(id);
        if (view == null) return NotFound();
        return Ok(view);
    }

    [HttpPost]
    public async Task<ActionResult<SavedViewResponse>> Create([FromBody] CreateSavedViewRequest request)
    {
        var view = await _service.CreateAsync(GetCurrentUserId(), request);
        return CreatedAtAction(nameof(GetById), new { id = view.SysId }, view);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<SavedViewResponse>> Update(long id, [FromBody] UpdateSavedViewRequest request)
    {
        var view = await _service.UpdateAsync(id, request);
        if (view == null) return NotFound();
        return Ok(view);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await _service.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
