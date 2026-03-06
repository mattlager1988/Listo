using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/[controller]")]
[Authorize]
public class CycleGoalsController : ControllerBase
{
    private readonly ICycleGoalService _cycleGoalService;

    public CycleGoalsController(ICycleGoalService cycleGoalService)
    {
        _cycleGoalService = cycleGoalService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CycleGoalResponse>>> GetAll([FromQuery] bool includeDeleted = false)
    {
        var goals = await _cycleGoalService.GetAllAsync(includeDeleted);
        return Ok(goals);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CycleGoalResponse>> GetById(long id)
    {
        var goal = await _cycleGoalService.GetByIdAsync(id);
        if (goal == null) return NotFound();
        return Ok(goal);
    }

    [HttpPost]
    public async Task<ActionResult<CycleGoalResponse>> Create([FromBody] CreateCycleGoalRequest request)
    {
        var goal = await _cycleGoalService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = goal.SysId }, goal);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CycleGoalResponse>> Update(long id, [FromBody] UpdateCycleGoalRequest request)
    {
        var goal = await _cycleGoalService.UpdateAsync(id, request);
        if (goal == null) return NotFound();
        return Ok(goal);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await _cycleGoalService.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public async Task<ActionResult<CycleGoalResponse>> Reactivate(long id)
    {
        var goal = await _cycleGoalService.ReactivateAsync(id);
        if (goal == null) return NotFound();
        return Ok(goal);
    }
}
