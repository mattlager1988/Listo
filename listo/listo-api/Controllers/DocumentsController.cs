using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Listo.Api.DTOs;
using Listo.Api.Services;
using System.Security.Claims;

namespace Listo.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly IDocumentService _documentService;
    private readonly ISettingsService _settingsService;

    public DocumentsController(IDocumentService documentService, ISettingsService settingsService)
    {
        _documentService = documentService;
        _settingsService = settingsService;
    }

    private long? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value;
        return long.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetDocuments(
        [FromQuery] string? module,
        [FromQuery] string? entityType,
        [FromQuery] long? entitySysId)
    {
        var documents = await _documentService.GetDocumentsAsync(
            module ?? "", entityType ?? "", entitySysId);
        return Ok(documents);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var document = await _documentService.GetByIdAsync(id);
        if (document == null) return NotFound();
        return Ok(document);
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(long id)
    {
        var result = await _documentService.DownloadAsync(id);
        if (result == null) return NotFound();

        var (stream, fileName, mimeType) = result.Value;
        return File(stream, mimeType, fileName);
    }

    [HttpPost]
    [RequestSizeLimit(262_144_000)] // 250MB
    [RequestFormLimits(MultipartBodyLengthLimit = 262_144_000)]
    public async Task<IActionResult> Upload(
        IFormFile file,
        [FromForm] string description,
        [FromForm] string module,
        [FromForm] string entityType,
        [FromForm] long? entitySysId,
        [FromForm] long? documentTypeSysId)
    {
        var userId = GetCurrentUserId();
        if (!userId.HasValue) return Unauthorized();

        // Validate file size
        var maxSizeMB = await _settingsService.GetIntValueAsync("DocumentStorage:MaxFileSizeMB", 250);
        if (file.Length > maxSizeMB * 1024 * 1024)
        {
            return BadRequest(new { message = $"File size exceeds {maxSizeMB}MB limit" });
        }

        // Validate extension
        var allowedExtensions = await _settingsService.GetArrayValueAsync(
            "DocumentStorage:AllowedExtensions",
            new[] { ".pdf", ".doc", ".docx", ".png", ".jpg" });
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
        {
            return BadRequest(new { message = $"File type {extension} is not allowed" });
        }

        var request = new CreateDocumentRequest(description, module, entityType, entitySysId, documentTypeSysId);

        using var stream = file.OpenReadStream();
        var document = await _documentService.UploadAsync(stream, file.FileName, request, userId.Value);

        return CreatedAtAction(nameof(GetById), new { id = document.SysId }, document);
    }

    [HttpPut("{id}")]
    [RequestSizeLimit(262_144_000)] // 250MB
    [RequestFormLimits(MultipartBodyLengthLimit = 262_144_000)]
    public async Task<IActionResult> Update(
        long id,
        [FromForm] string? description,
        [FromForm] long? documentTypeSysId,
        IFormFile? file)
    {
        // Validate file if provided
        if (file != null)
        {
            var maxSizeMB = await _settingsService.GetIntValueAsync("DocumentStorage:MaxFileSizeMB", 250);
            if (file.Length > maxSizeMB * 1024 * 1024)
            {
                return BadRequest(new { message = $"File size exceeds {maxSizeMB}MB limit" });
            }

            var allowedExtensions = await _settingsService.GetArrayValueAsync(
                "DocumentStorage:AllowedExtensions",
                new[] { ".pdf", ".doc", ".docx", ".png", ".jpg" });
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = $"File type {extension} is not allowed" });
            }
        }

        var request = new UpdateDocumentRequest(description, documentTypeSysId);

        if (file != null)
        {
            using var stream = file.OpenReadStream();
            var document = await _documentService.UpdateAsync(id, request, stream, file.FileName);
            if (document == null) return NotFound();
            return Ok(document);
        }
        else
        {
            var document = await _documentService.UpdateAsync(id, request);
            if (document == null) return NotFound();
            return Ok(document);
        }
    }

    [HttpGet("discontinued")]
    public async Task<IActionResult> GetDiscontinued(
        [FromQuery] string? module,
        [FromQuery] string? entityType,
        [FromQuery] long? entitySysId)
    {
        var documents = await _documentService.GetDiscontinuedAsync(
            module ?? "", entityType ?? "", entitySysId);
        return Ok(documents);
    }

    [HttpPost("{id}/discontinue")]
    public async Task<IActionResult> Discontinue(long id)
    {
        var success = await _documentService.DiscontinueAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPost("{id}/reactivate")]
    public async Task<IActionResult> Reactivate(long id)
    {
        var document = await _documentService.ReactivateAsync(id);
        if (document == null) return NotFound();
        return Ok(document);
    }
}
