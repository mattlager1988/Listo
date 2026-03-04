using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = "admin")]
public class SettingsController : ControllerBase
{
    private readonly ISettingsService _settingsService;

    public SettingsController(ISettingsService settingsService)
    {
        _settingsService = settingsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var settings = await _settingsService.GetAllGroupedAsync();
        return Ok(settings);
    }

    [HttpPut("{key}")]
    public async Task<IActionResult> Update(string key, [FromBody] UpdateSettingRequest request)
    {
        // URL decode the key since it may contain colons
        key = Uri.UnescapeDataString(key);

        var setting = await _settingsService.UpdateSettingAsync(key, request.Value);
        if (setting == null)
            return NotFound(new { message = $"Setting '{key}' not found" });

        return Ok(setting);
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkUpdate([FromBody] BulkUpdateSettingsRequest request)
    {
        var settings = await _settingsService.BulkUpdateSettingsAsync(request.Settings);
        return Ok(settings);
    }
}
