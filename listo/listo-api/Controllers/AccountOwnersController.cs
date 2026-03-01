using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/lksem/[controller]")]
[Authorize]
public class AccountOwnersController : ControllerBase
{
    private readonly IAccountOwnerService _service;

    public AccountOwnersController(IAccountOwnerService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountOwnerResponse>>> GetAll([FromQuery] bool includeDeleted = false)
    {
        var owners = await _service.GetAllAsync(includeDeleted);
        return Ok(owners);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountOwnerResponse>> GetById(long id)
    {
        var owner = await _service.GetByIdAsync(id);
        if (owner == null) return NotFound();
        return Ok(owner);
    }

    [HttpPost]
    public async Task<ActionResult<AccountOwnerResponse>> Create([FromBody] CreateAccountOwnerRequest request)
    {
        try
        {
            var owner = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = owner.SysId }, owner);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AccountOwnerResponse>> Update(long id, [FromBody] UpdateAccountOwnerRequest request)
    {
        try
        {
            var owner = await _service.UpdateAsync(id, request);
            if (owner == null) return NotFound();
            return Ok(owner);
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
