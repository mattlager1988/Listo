using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/passwords/[controller]")]
[Authorize]
public class PasswordCategoriesController : ControllerBase
{
    private readonly IPasswordCategoryService _service;

    public PasswordCategoriesController(IPasswordCategoryService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PasswordCategoryResponse>>> GetAll([FromQuery] bool includeDeleted = false)
    {
        var categories = await _service.GetAllAsync(includeDeleted);
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PasswordCategoryResponse>> GetById(long id)
    {
        var category = await _service.GetByIdAsync(id);
        if (category == null) return NotFound();
        return Ok(category);
    }

    [HttpPost]
    public async Task<ActionResult<PasswordCategoryResponse>> Create([FromBody] CreatePasswordCategoryRequest request)
    {
        try
        {
            var category = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = category.SysId }, category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PasswordCategoryResponse>> Update(long id, [FromBody] UpdatePasswordCategoryRequest request)
    {
        try
        {
            var category = await _service.UpdateAsync(id, request);
            if (category == null) return NotFound();
            return Ok(category);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> SoftDelete(long id)
    {
        var deleted = await _service.SoftDeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(long id)
    {
        try
        {
            var restored = await _service.RestoreAsync(id);
            if (!restored) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}/purge")]
    public async Task<IActionResult> Purge(long id)
    {
        try
        {
            var purged = await _service.PurgeAsync(id);
            if (!purged) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
