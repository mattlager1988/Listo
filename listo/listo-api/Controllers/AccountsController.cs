using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/lksem/[controller]")]
[Authorize]
public class AccountsController : ControllerBase
{
    private readonly IAccountService _accountService;

    public AccountsController(IAccountService accountService)
    {
        _accountService = accountService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AccountResponse>>> GetAll()
    {
        var accounts = await _accountService.GetAllAccountsAsync();
        return Ok(accounts);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AccountResponse>> GetById(long id)
    {
        var account = await _accountService.GetAccountByIdAsync(id);
        if (account == null) return NotFound();
        return Ok(account);
    }

    [HttpPost]
    public async Task<ActionResult<AccountResponse>> Create([FromBody] CreateAccountRequest request)
    {
        try
        {
            var account = await _accountService.CreateAccountAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = account.SysId }, account);
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
            var account = await _accountService.UpdateAccountAsync(id, request);
            if (account == null) return NotFound();
            return Ok(account);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("discontinued")]
    public async Task<ActionResult<IEnumerable<AccountResponse>>> GetDiscontinued()
    {
        var accounts = await _accountService.GetDiscontinuedAccountsAsync();
        return Ok(accounts);
    }

    [HttpPost("{id}/discontinue")]
    public async Task<IActionResult> Discontinue(long id)
    {
        var discontinued = await _accountService.DiscontinueAccountAsync(id);
        if (!discontinued) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public async Task<ActionResult<AccountResponse>> Reactivate(long id)
    {
        var account = await _accountService.ReactivateAccountAsync(id);
        if (account == null) return NotFound();
        return Ok(account);
    }
}
