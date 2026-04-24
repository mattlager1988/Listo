using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.Services;

namespace Listo.Api.Controllers;

public record StartTranscriptionRequest(string Url);

[ApiController]
[Route("api/aviation/[controller]")]
[Authorize]
public class TranscriptionController : ControllerBase
{
    private readonly ITranscriptionSessionManager _sessionManager;
    private readonly ISettingsService _settingsService;

    public TranscriptionController(ITranscriptionSessionManager sessionManager, ISettingsService settingsService)
    {
        _sessionManager = sessionManager;
        _settingsService = settingsService;
    }

    [HttpPost("start")]
    [AllowAnonymous]
    public async Task<IActionResult> Start([FromBody] StartTranscriptionRequest request)
    {
        var apiKey = await _settingsService.GetValueAsync("OpenAI:ApiKey");
        if (string.IsNullOrEmpty(apiKey))
            return BadRequest(new { message = "OpenAI API key is not configured. Set it in Admin > Listo Settings." });

        var sessionId = _sessionManager.StartSession(request.Url, apiKey);
        return Ok(new { sessionId });
    }

    [HttpGet("{sessionId}/poll")]
    [AllowAnonymous]
    public IActionResult Poll(string sessionId)
    {
        var (segments, isComplete) = _sessionManager.Poll(sessionId);
        return Ok(new { segments, isComplete });
    }

    [HttpDelete("{sessionId}")]
    [AllowAnonymous]
    public IActionResult Stop(string sessionId)
    {
        _sessionManager.StopSession(sessionId);
        return NoContent();
    }
}
