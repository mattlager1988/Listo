using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/lizzylog/entries")]
[Authorize]
[Listo.Api.Authorization.ModuleAccess(Listo.Api.Models.ModuleKeys.LizzyLog)]
public class PeriodLogEntriesController : ControllerBase
{
    private readonly IPeriodLogService _service;

    public PeriodLogEntriesController(IPeriodLogService service)
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
    public async Task<IActionResult> GetForPeriod([FromQuery] long periodId)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        var entries = await _service.GetEntriesAsync(periodId, userId.Value);
        if (entries == null) return NotFound();
        return Ok(entries);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePeriodLogEntryRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var entry = await _service.CreateEntryAsync(request, userId.Value);
            if (entry == null) return NotFound();
            return Ok(entry);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdatePeriodLogEntryRequest request)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        try
        {
            var entry = await _service.UpdateEntryAsync(id, request, userId.Value);
            if (entry == null) return NotFound();
            return Ok(entry);
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

        var success = await _service.DeleteEntryAsync(id, userId.Value);
        if (!success) return NotFound();
        return NoContent();
    }
}
