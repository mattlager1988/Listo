using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class TrainingTypesController : ControllerBase
{
    private readonly ITrainingTypeService _service;

    public TrainingTypesController(ITrainingTypeService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeDeleted = false)
    {
        var types = await _service.GetAllAsync(includeDeleted);
        return Ok(types);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var type = await _service.GetByIdAsync(id);
        if (type == null) return NotFound();
        return Ok(type);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateTrainingTypeRequest request)
    {
        try
        {
            var type = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = type.SysId }, type);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateTrainingTypeRequest request)
    {
        try
        {
            var type = await _service.UpdateAsync(id, request);
            if (type == null) return NotFound();
            return Ok(type);
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
        var success = await _service.SoftDeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Restore(long id)
    {
        var success = await _service.RestoreAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}/purge")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Purge(long id)
    {
        try
        {
            var success = await _service.PurgeAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
