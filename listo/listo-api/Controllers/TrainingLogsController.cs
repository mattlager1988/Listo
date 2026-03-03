using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class TrainingLogsController : ControllerBase
{
    private readonly ITrainingLogService _service;

    public TrainingLogsController(ITrainingLogService service)
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
    public async Task<IActionResult> GetAll([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var logs = await _service.GetAllAsync(userId.Value, startDate, endDate);
        return Ok(logs);
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

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary([FromQuery] DateTime? startDate, [FromQuery] DateTime? endDate)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var summary = await _service.GetSummaryAsync(userId.Value, startDate, endDate);
        return Ok(summary);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTrainingLogRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var log = await _service.CreateAsync(request, userId.Value);
        return CreatedAtAction(nameof(GetById), new { id = log.SysId }, log);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateTrainingLogRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var log = await _service.UpdateAsync(id, request, userId.Value);
        if (log == null) return NotFound();
        return Ok(log);
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
