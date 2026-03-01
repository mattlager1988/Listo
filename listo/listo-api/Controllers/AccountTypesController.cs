using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountTypesController : ControllerBase
{
    private readonly IAccountTypeService _service;

    public AccountTypesController(IAccountTypeService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ListItemResponse>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var items = await _service.GetAllAsync(includeInactive);
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ListItemResponse>> GetById(long id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<ListItemResponse>> Create([FromBody] CreateListItemRequest request)
    {
        try
        {
            var item = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = item.SysId }, item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ListItemResponse>> Update(long id, [FromBody] UpdateListItemRequest request)
    {
        try
        {
            var item = await _service.UpdateAsync(id, request);
            if (item == null) return NotFound();
            return Ok(item);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        try
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
