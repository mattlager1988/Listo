using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/messaging")]
[Authorize]
[Listo.Api.Authorization.ModuleAccess(Listo.Api.Models.ModuleKeys.Messaging)]
public class MessagingController : ControllerBase
{
    private readonly IMessagingService _service;
    private readonly ISettingsService _settingsService;

    private static readonly string[] ImageExtensions = { ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp" };
    private static readonly string[] VideoExtensions = { ".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".3gp" };

    public MessagingController(IMessagingService service, ISettingsService settingsService)
    {
        _service = service;
        _settingsService = settingsService;
    }

    private long? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private async Task<IActionResult> RunAsync(Func<long, Task<IActionResult>> action)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();
        try
        {
            return await action(userId.Value);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("conversations")]
    public Task<IActionResult> GetConversations() =>
        RunAsync(async uid => Ok(await _service.GetConversationsAsync(uid)));

    [HttpGet("conversations/{id}")]
    public Task<IActionResult> GetConversation(long id) =>
        RunAsync(async uid =>
        {
            var conv = await _service.GetConversationAsync(id, uid);
            return conv == null ? NotFound() : Ok(conv);
        });

    [HttpPost("conversations")]
    public Task<IActionResult> CreateConversation([FromBody] CreateConversationRequest request) =>
        RunAsync(async uid =>
        {
            var conv = await _service.CreateConversationAsync(uid, request);
            return Ok(conv);
        });

    [HttpPut("conversations/{id}")]
    public Task<IActionResult> UpdateGroup(long id, [FromBody] UpdateGroupRequest request) =>
        RunAsync(async uid => Ok(await _service.UpdateGroupAsync(uid, id, request)));

    // Delete the conversation from the current user's view only (other participants keep it).
    [HttpDelete("conversations/{id}")]
    public Task<IActionResult> DeleteConversation(long id) =>
        RunAsync(async uid =>
        {
            await _service.DeleteConversationForUserAsync(uid, id);
            return NoContent();
        });

    [HttpGet("conversations/{id}/messages")]
    public Task<IActionResult> GetMessages(long id, [FromQuery] long? before, [FromQuery] int take = 50) =>
        RunAsync(async uid => Ok(await _service.GetMessagesAsync(id, uid, before, take)));

    [HttpPost("conversations/{id}/messages")]
    public Task<IActionResult> SendMessage(long id, [FromBody] SendMessageRequest request) =>
        RunAsync(async uid => Ok(await _service.SendMessageAsync(uid, id, request.Body)));

    // Send a message with image/video attachments (and optional text) in one multipart request.
    [HttpPost("conversations/{id}/messages/media")]
    [RequestSizeLimit(536_870_912)] // 512MB
    [RequestFormLimits(MultipartBodyLengthLimit = 536_870_912)]
    public Task<IActionResult> SendMediaMessage(
        long id,
        [FromForm] string? body,
        [FromForm] List<IFormFile> files) =>
        RunAsync(async uid =>
        {
            if (files == null || files.Count == 0)
                return BadRequest(new { message = "At least one file is required" });

            var maxSizeMB = await _settingsService.GetIntValueAsync("Messaging:MaxAttachmentSizeMB", 512);
            var basePath = await GetStoragePathAsync();
            var attachments = new List<NewAttachment>();

            foreach (var file in files)
            {
                if (file.Length > (long)maxSizeMB * 1024 * 1024)
                    return BadRequest(new { message = $"File '{file.FileName}' exceeds the {maxSizeMB}MB limit" });

                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                var kind = ImageExtensions.Contains(ext) ? "image"
                    : VideoExtensions.Contains(ext) ? "video"
                    : null;
                if (kind == null)
                    return BadRequest(new { message = $"File type '{ext}' is not a supported image or video" });

                var storedName = $"{Guid.NewGuid()}{ext}";
                var fullPath = Path.Combine(basePath, storedName);
                using (var stream = new FileStream(fullPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                attachments.Add(new NewAttachment(
                    storedName,
                    file.FileName,
                    file.ContentType ?? (kind == "image" ? "image/*" : "video/*"),
                    file.Length,
                    fullPath,
                    kind));
            }

            var message = await _service.SendMessageAsync(uid, id, body, attachments);
            return Ok(message);
        });

    [HttpGet("attachments/{id}")]
    public Task<IActionResult> GetAttachment(long id) =>
        RunAsync(async uid =>
        {
            var result = await _service.GetAttachmentAsync(id, uid);
            if (result == null) return NotFound();

            var (path, mimeType, originalName) = result.Value;
            if (!System.IO.File.Exists(path)) return NotFound();

            var stream = new FileStream(path, FileMode.Open, FileAccess.Read);
            return File(stream, mimeType, originalName);
        });

    private async Task<string> GetStoragePathAsync()
    {
        var basePath = await _settingsService.GetValueAsync("DocumentStorage:BasePath") ?? "./uploads";
        var messagingPath = Path.Combine(basePath, "messaging");
        Directory.CreateDirectory(messagingPath);
        return messagingPath;
    }

    [HttpPost("conversations/{id}/read")]
    public Task<IActionResult> MarkRead(long id, [FromBody] MarkReadRequest request) =>
        RunAsync(async uid =>
        {
            await _service.MarkReadAsync(uid, id, request.LastReadMessageSysId);
            return NoContent();
        });

    [HttpPost("messages/{id}/reactions")]
    public Task<IActionResult> AddReaction(long id, [FromBody] AddReactionRequest request) =>
        RunAsync(async uid => Ok(await _service.AddReactionAsync(uid, id, request.Emoji)));

    [HttpDelete("messages/{id}/reactions")]
    public Task<IActionResult> RemoveReaction(long id, [FromQuery] string emoji) =>
        RunAsync(async uid =>
        {
            var removed = await _service.RemoveReactionAsync(uid, id, emoji);
            return removed ? NoContent() : NotFound();
        });

    [HttpGet("users")]
    public Task<IActionResult> GetUsers() =>
        RunAsync(async uid => Ok(await _service.GetUsersAsync(uid)));
}
