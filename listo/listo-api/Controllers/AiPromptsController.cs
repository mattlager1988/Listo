using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class AiPromptsController : ControllerBase
{
    private readonly IAiPromptService _service;

    public AiPromptsController(IAiPromptService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeDeleted = false)
    {
        var prompts = await _service.GetAllAsync(includeDeleted);
        return Ok(prompts);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var prompt = await _service.GetByIdAsync(id);
        if (prompt == null) return NotFound();
        return Ok(prompt);
    }

    [HttpPost]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromBody] CreateAiPromptRequest request)
    {
        try
        {
            var prompt = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = prompt.SysId }, prompt);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateAiPromptRequest request)
    {
        try
        {
            var prompt = await _service.UpdateAsync(id, request);
            if (prompt == null) return NotFound();
            return Ok(prompt);
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
        var success = await _service.PurgeAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("analyze")]
    public async Task<IActionResult> Analyze([FromBody] TrainingAnalysisRequest request)
    {
        try
        {
            var result = await _service.AnalyzeTrainingLogsAsync(request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
