using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _service;

    public AccountsController(IAccountService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountResponse>>> GetAll()
    {
        var accounts = await _service.GetAllAsync();
        return Ok(accounts);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountResponse>> GetById(long id)
    {
        var account = await _service.GetByIdAsync(id);
        if (account == null) return NotFound();
        return Ok(account);
    }

    [HttpPost]
    public async Task<ActionResult<AccountResponse>> Create([FromBody] CreateAccountRequest request)
    {
        try
        {
            var account = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = account.SysId }, account);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AccountResponse>> Update(long id, [FromBody] UpdateAccountRequest request)
    {
        try
        {
            var account = await _service.UpdateAsync(id, request);
            if (account == null) return NotFound();
            return Ok(account);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await _service.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
