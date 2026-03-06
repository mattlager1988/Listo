using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/finance/[controller]")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _service;

    public PaymentsController(IPaymentService service)
    {
        _service = service;
    }

    [HttpGet("pending")]
    public async Task<ActionResult<IEnumerable<PaymentResponse>>> GetPending()
    {
        var payments = await _service.GetPendingPaymentsAsync();
        return Ok(payments);
    }

    [HttpGet("account/{accountSysId}")]
    public async Task<ActionResult<IEnumerable<PaymentResponse>>> GetByAccount(long accountSysId)
    {
        var payments = await _service.GetPaymentsByAccountAsync(accountSysId);
        return Ok(payments);
    }

    [HttpGet("account/{accountSysId}/summary")]
    public async Task<ActionResult<IEnumerable<PaymentSummaryResponse>>> GetSummary(long accountSysId, [FromQuery] int months = 12)
    {
        var summary = await _service.GetPaymentSummaryAsync(accountSysId, months);
        return Ok(summary);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PaymentResponse>> GetById(long id)
    {
        var payment = await _service.GetByIdAsync(id);
        if (payment == null) return NotFound();
        return Ok(payment);
    }

    [HttpPost]
    public async Task<ActionResult<PaymentResponse>> Create([FromBody] CreatePaymentRequest request)
    {
        try
        {
            var payment = await _service.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = payment.SysId }, payment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PaymentResponse>> Update(long id, [FromBody] UpdatePaymentRequest request)
    {
        try
        {
            var payment = await _service.UpdateAsync(id, request);
            if (payment == null) return NotFound();
            return Ok(payment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/complete")]
    public async Task<ActionResult<PaymentResponse>> Complete(long id)
    {
        var payment = await _service.CompleteAsync(id);
        if (payment == null) return NotFound();
        return Ok(payment);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id, [FromQuery] bool reverseLedger = false)
    {
        try
        {
            var result = await _service.DeleteAsync(id, reverseLedger);
            if (!result) return NotFound();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
