using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/[controller]")]
[Authorize]
public class BankAccountsController : ControllerBase
{
    private readonly IBankAccountService _service;
    private readonly ILedgerTransactionService _transactionService;

    public BankAccountsController(IBankAccountService service, ILedgerTransactionService transactionService)
    {
        _service = service;
        _transactionService = transactionService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BankAccountResponse>>> GetAll()
    {
        var accounts = await _service.GetAllAsync();
        return Ok(accounts);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<BankAccountResponse>> GetById(long id)
    {
        var account = await _service.GetByIdAsync(id);
        if (account == null) return NotFound();
        return Ok(account);
    }

    [HttpPost]
    public async Task<ActionResult<BankAccountResponse>> Create([FromBody] CreateBankAccountRequest request)
    {
        var account = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = account.SysId }, account);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<BankAccountResponse>> Update(long id, [FromBody] UpdateBankAccountRequest request)
    {
        var account = await _service.UpdateAsync(id, request);
        if (account == null) return NotFound();
        return Ok(account);
    }

    [HttpGet("discontinued")]
    public async Task<ActionResult<IEnumerable<BankAccountResponse>>> GetDiscontinued()
    {
        var accounts = await _service.GetDiscontinuedAsync();
        return Ok(accounts);
    }

    [HttpPost("{id}/discontinue")]
    public async Task<IActionResult> Discontinue(long id)
    {
        var discontinued = await _service.DiscontinueAsync(id);
        if (!discontinued) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public async Task<ActionResult<BankAccountResponse>> Reactivate(long id)
    {
        var account = await _service.ReactivateAsync(id);
        if (account == null) return NotFound();
        return Ok(account);
    }

    // Ledger Transaction endpoints
    [HttpGet("{id}/transactions")]
    public async Task<ActionResult<IEnumerable<LedgerTransactionResponse>>> GetTransactions(long id)
    {
        var transactions = await _transactionService.GetByBankAccountAsync(id);
        return Ok(transactions);
    }

    [HttpPost("{id}/transactions")]
    public async Task<ActionResult<LedgerTransactionResponse>> CreateTransaction(long id, [FromBody] CreateLedgerTransactionRequest request)
    {
        if (request.BankAccountSysId != id)
            return BadRequest(new { message = "Bank account ID mismatch" });

        try
        {
            var transaction = await _transactionService.CreateAsync(request);
            return CreatedAtAction(nameof(GetTransactionById), new { id = id, transactionId = transaction.SysId }, transaction);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{id}/transactions/{transactionId}")]
    public async Task<ActionResult<LedgerTransactionResponse>> GetTransactionById(long id, long transactionId)
    {
        var transaction = await _transactionService.GetByIdAsync(transactionId);
        if (transaction == null || transaction.BankAccountSysId != id) return NotFound();
        return Ok(transaction);
    }

    [HttpDelete("{id}/transactions/{transactionId}")]
    public async Task<IActionResult> DeleteTransaction(long id, long transactionId)
    {
        try
        {
            var transaction = await _transactionService.GetByIdAsync(transactionId);
            if (transaction == null || transaction.BankAccountSysId != id) return NotFound();

            var result = await _transactionService.DeleteAsync(transactionId);
            if (!result) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
