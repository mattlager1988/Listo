using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/lksem/[controller]")]
[Authorize]
public class PaymentMethodsController : ControllerBase
{
    private readonly IPaymentMethodService _service;

    public PaymentMethodsController(IPaymentMethodService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PaymentMethodResponse>>> GetAll([FromQuery] bool includeDeleted = false)
    {
        var items = await _service.GetAllAsync(includeDeleted);
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PaymentMethodResponse>> GetById(long id)
    {
        var item = await _service.GetByIdAsync(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpPost]
    public async Task<ActionResult<PaymentMethodResponse>> Create([FromBody] CreatePaymentMethodRequest request)
    {
        var item = await _service.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = item.SysId }, item);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PaymentMethodResponse>> Update(long id, [FromBody] UpdatePaymentMethodRequest request)
    {
        var item = await _service.UpdateAsync(id, request);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var result = await _service.DeleteAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(long id)
    {
        var result = await _service.RestoreAsync(id);
        if (!result) return NotFound();
        return NoContent();
    }

    [HttpDelete("{id}/purge")]
    public async Task<IActionResult> Purge(long id)
    {
        var result = await _service.PurgeAsync(id);
        if (!result) return BadRequest(new { message = "Cannot purge: item is in use or not found" });
        return NoContent();
    }
}
