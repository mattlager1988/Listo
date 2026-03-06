using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/[controller]")]
[Authorize]
public class CycleTransactionsController : ControllerBase
{
    private readonly ICycleTransactionService _cycleTransactionService;

    public CycleTransactionsController(ICycleTransactionService cycleTransactionService)
    {
        _cycleTransactionService = cycleTransactionService;
    }

    [HttpGet("cycleplan/{cyclePlanSysId}")]
    public async Task<ActionResult<IEnumerable<CycleTransactionResponse>>> GetByCyclePlan(long cyclePlanSysId)
    {
        var transactions = await _cycleTransactionService.GetByCyclePlanAsync(cyclePlanSysId);
        return Ok(transactions);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CycleTransactionResponse>> GetById(long id)
    {
        var transaction = await _cycleTransactionService.GetByIdAsync(id);
        if (transaction == null) return NotFound();
        return Ok(transaction);
    }

    [HttpPost]
    public async Task<ActionResult<CycleTransactionResponse>> Create([FromBody] CreateCycleTransactionRequest request)
    {
        var transaction = await _cycleTransactionService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = transaction.SysId }, transaction);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<CycleTransactionResponse>> Update(long id, [FromBody] UpdateCycleTransactionRequest request)
    {
        var transaction = await _cycleTransactionService.UpdateAsync(id, request);
        if (transaction == null) return NotFound();
        return Ok(transaction);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var deleted = await _cycleTransactionService.DeleteAsync(id);
        if (!deleted) return NotFound();
        return NoContent();
    }
}
