using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/lksem/[controller]")]
[Authorize]
public class AccountTypesController : ControllerBase
{
    private readonly IAccountTypeService _service;

    public AccountTypesController(IAccountTypeService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountTypeResponse>>> GetAll([FromQuery] bool includeDeleted = false)
    {
        var types = await _service.GetAllAsync(includeDeleted);
        return Ok(types);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountTypeResponse>> GetById(long id)
    {
        var type = await _service.GetByIdAsync(id);
        if (type == null) return NotFound();
        return Ok(type);
    }

    [HttpPost]
    public async Task<ActionResult<AccountTypeResponse>> Create([FromBody] CreateAccountTypeRequest request)
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
    public async Task<ActionResult<AccountTypeResponse>> Update(long id, [FromBody] UpdateAccountTypeRequest request)
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
    public async Task<IActionResult> SoftDelete(long id)
    {
        var deleted = await _service.SoftDeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(long id)
    {
        var restored = await _service.RestoreAsync(id);
        if (!restored) return NotFound();
        return NoContent();
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
