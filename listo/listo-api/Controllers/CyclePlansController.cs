using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/[controller]")]
[Authorize]
public class CyclePlansController : ControllerBase
{
    private readonly ICyclePlanService _cyclePlanService;

    public CyclePlansController(ICyclePlanService cyclePlanService)
    {
        _cyclePlanService = cyclePlanService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CyclePlanResponse>>> GetAll()
    {
        var plans = await _cyclePlanService.GetAllAsync();
        return Ok(plans);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CyclePlanResponse>> GetById(long id)
    {
        var plan = await _cyclePlanService.GetByIdAsync(id);
        if (plan == null) return NotFound();
        return Ok(plan);
    }

    [HttpPost]
    public async Task<ActionResult<CyclePlanResponse>> Create([FromBody] CreateCyclePlanRequest request)
    {
        var plan = await _cyclePlanService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = plan.SysId }, plan);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CyclePlanResponse>> Update(long id, [FromBody] UpdateCyclePlanRequest request)
    {
        var plan = await _cyclePlanService.UpdateAsync(id, request);
        if (plan == null) return NotFound();
        return Ok(plan);
    }

    [HttpGet("discontinued")]
    public async Task<ActionResult<IEnumerable<CyclePlanResponse>>> GetDiscontinued()
    {
        var plans = await _cyclePlanService.GetDiscontinuedAsync();
        return Ok(plans);
    }

    [HttpPost("{id}/discontinue")]
    public async Task<IActionResult> Discontinue(long id)
    {
        var discontinued = await _cyclePlanService.DiscontinueAsync(id);
        if (!discontinued) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public async Task<ActionResult<CyclePlanResponse>> Reactivate(long id)
    {
        var plan = await _cyclePlanService.ReactivateAsync(id);
        if (plan == null) return NotFound();
        return Ok(plan);
    }
}
