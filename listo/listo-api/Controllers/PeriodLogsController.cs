using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/lizzylog/periods")]
[Authorize]
[Listo.Api.Authorization.ModuleAccess(Listo.Api.Models.ModuleKeys.LizzyLog)]
public class PeriodLogsController : ControllerBase
{
    private readonly IPeriodLogService _service;

    public PeriodLogsController(IPeriodLogService service)
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

        var logs = await _service.GetAllAsync(userId.Value);
        return Ok(logs);
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var stats = await _service.GetStatsAsync(userId.Value);
        return Ok(stats);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var log = await _service.GetByIdAsync(id, userId.Value);
        if (log == null) return NotFound();
        return Ok(log);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePeriodLogRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var log = await _service.CreateAsync(request, userId.Value);
            return CreatedAtAction(nameof(GetById), new { id = log.SysId }, log);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdatePeriodLogRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var log = await _service.UpdateAsync(id, request, userId.Value);
            if (log == null) return NotFound();
            return Ok(log);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
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
