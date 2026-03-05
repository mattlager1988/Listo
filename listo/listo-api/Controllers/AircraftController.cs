using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class AircraftController : ControllerBase
{
    private readonly IAircraftService _service;

    public AircraftController(IAircraftService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeDeleted = false)
    {
        var aircraft = await _service.GetAllAsync(includeDeleted);
        return Ok(aircraft);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var aircraft = await _service.GetByIdAsync(id);
        if (aircraft == null) return NotFound();
        return Ok(aircraft);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateAircraftRequest request)
    {
        try
        {
            var aircraft = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = aircraft.SysId }, aircraft);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateAircraftRequest request)
    {
        try
        {
            var aircraft = await _service.UpdateAsync(id, request);
            if (aircraft == null) return NotFound();
            return Ok(aircraft);
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
        try
        {
            var success = await _service.RestoreAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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
