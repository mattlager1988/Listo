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
    private readonly IConfiguration _configuration;

    public DocumentsController(IDocumentService documentService, IConfiguration configuration)
    {
        _documentService = documentService;
        _configuration = configuration;
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
        var maxSizeMB = _configuration.GetValue<int>("DocumentStorage:MaxFileSizeMB", 50);
        if (file.Length > maxSizeMB * 1024 * 1024)
        {
            return BadRequest(new { message = $"File size exceeds {maxSizeMB}MB limit" });
        }

        // Validate extension
        var allowedExtensions = _configuration.GetSection("DocumentStorage:AllowedExtensions")
            .Get<string[]>() ?? new[] { ".pdf", ".doc", ".docx", ".png", ".jpg" };
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
    public async Task<IActionResult> Update(long id, [FromBody] UpdateDocumentRequest request)
    {
        var document = await _documentService.UpdateAsync(id, request);
        if (document == null) return NotFound();
        return Ok(document);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var success = await _documentService.DeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
