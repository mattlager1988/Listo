using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface IDocumentService
{
    Task<IEnumerable<DocumentResponse>> GetDocumentsAsync(string module, string entityType, long? entitySysId);
    Task<DocumentResponse?> GetByIdAsync(long id);
    Task<DocumentResponse> UploadAsync(Stream fileStream, string fileName, CreateDocumentRequest request, long userId);
    Task<DocumentResponse?> UpdateAsync(long id, UpdateDocumentRequest request, Stream? newFileStream = null, string? newFileName = null);
    Task<bool> DeleteAsync(long id);
    Task<(Stream stream, string fileName, string mimeType)?> DownloadAsync(long id);
}

public class DocumentService : IDocumentService
{
    private readonly ListoDbContext _context;
    private readonly ISettingsService _settingsService;
    private string? _basePath;

    public DocumentService(ListoDbContext context, ISettingsService settingsService)
    {
        _context = context;
        _settingsService = settingsService;
    }

    private async Task<string> GetBasePathAsync()
    {
        if (_basePath == null)
        {
            _basePath = await _settingsService.GetValueAsync("DocumentStorage:BasePath", "./uploads");
            Directory.CreateDirectory(_basePath!);
        }
        return _basePath!;
    }

    public async Task<IEnumerable<DocumentResponse>> GetDocumentsAsync(string module, string entityType, long? entitySysId)
    {
        var query = _context.Documents
            .Include(d => d.UploadedBy)
            .Include(d => d.DocumentType)
            .AsQueryable();

        if (!string.IsNullOrEmpty(module))
            query = query.Where(d => d.Module == module);
        if (!string.IsNullOrEmpty(entityType))
            query = query.Where(d => d.EntityType == entityType);
        if (entitySysId.HasValue)
            query = query.Where(d => d.EntitySysId == entitySysId);

        return await query
            .OrderByDescending(d => d.CreateTimestamp)
            .Select(d => MapToResponse(d))
            .ToListAsync();
    }

    public async Task<DocumentResponse?> GetByIdAsync(long id)
    {
        var document = await _context.Documents
            .Include(d => d.UploadedBy)
            .Include(d => d.DocumentType)
            .FirstOrDefaultAsync(d => d.SysId == id);

        return document == null ? null : MapToResponse(document);
    }

    public async Task<DocumentResponse> UploadAsync(Stream fileStream, string fileName, CreateDocumentRequest request, long userId)
    {
        var basePath = await GetBasePathAsync();

        // Generate unique filename
        var extension = Path.GetExtension(fileName);
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var storagePath = Path.Combine(basePath, uniqueFileName);

        // Save file to disk
        using (var outputStream = File.Create(storagePath))
        {
            await fileStream.CopyToAsync(outputStream);
        }

        var fileInfo = new FileInfo(storagePath);
        var mimeType = GetMimeType(extension);

        var document = new Document
        {
            FileName = uniqueFileName,
            OriginalFileName = fileName,
            Description = request.Description,
            MimeType = mimeType,
            FileSize = fileInfo.Length,
            StoragePath = storagePath,
            Module = request.Module,
            EntityType = request.EntityType,
            EntitySysId = request.EntitySysId,
            DocumentTypeSysId = request.DocumentTypeSysId,
            UploadedBySysId = userId,
        };

        _context.Documents.Add(document);
        await _context.SaveChangesAsync();

        // Load navigation properties for response
        await _context.Entry(document).Reference(d => d.UploadedBy).LoadAsync();
        if (document.DocumentTypeSysId.HasValue)
            await _context.Entry(document).Reference(d => d.DocumentType).LoadAsync();

        return MapToResponse(document);
    }

    public async Task<DocumentResponse?> UpdateAsync(long id, UpdateDocumentRequest request, Stream? newFileStream = null, string? newFileName = null)
    {
        var document = await _context.Documents
            .Include(d => d.UploadedBy)
            .Include(d => d.DocumentType)
            .FirstOrDefaultAsync(d => d.SysId == id);

        if (document == null) return null;

        if (request.Description != null)
            document.Description = request.Description;
        if (request.DocumentTypeSysId.HasValue)
            document.DocumentTypeSysId = request.DocumentTypeSysId;

        // Handle file replacement
        if (newFileStream != null && !string.IsNullOrEmpty(newFileName))
        {
            var basePath = await GetBasePathAsync();

            // Delete old file from disk
            if (File.Exists(document.StoragePath))
            {
                File.Delete(document.StoragePath);
            }

            // Generate new unique filename
            var extension = Path.GetExtension(newFileName);
            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var storagePath = Path.Combine(basePath, uniqueFileName);

            // Save new file to disk
            using (var outputStream = File.Create(storagePath))
            {
                await newFileStream.CopyToAsync(outputStream);
            }

            var fileInfo = new FileInfo(storagePath);
            var mimeType = GetMimeType(extension);

            // Update document properties
            document.FileName = uniqueFileName;
            document.OriginalFileName = newFileName;
            document.MimeType = mimeType;
            document.FileSize = fileInfo.Length;
            document.StoragePath = storagePath;
        }

        await _context.SaveChangesAsync();

        // Reload document type if changed
        if (document.DocumentTypeSysId.HasValue)
            await _context.Entry(document).Reference(d => d.DocumentType).LoadAsync();

        return MapToResponse(document);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var document = await _context.Documents.FindAsync(id);
        if (document == null) return false;

        // Delete file from disk
        if (File.Exists(document.StoragePath))
        {
            File.Delete(document.StoragePath);
        }

        _context.Documents.Remove(document);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<(Stream stream, string fileName, string mimeType)?> DownloadAsync(long id)
    {
        var document = await _context.Documents.FindAsync(id);
        if (document == null || !File.Exists(document.StoragePath))
            return null;

        var stream = File.OpenRead(document.StoragePath);
        return (stream, document.OriginalFileName, document.MimeType);
    }

    private static DocumentResponse MapToResponse(Document d) => new(
        d.SysId,
        d.FileName,
        d.OriginalFileName,
        d.Description,
        d.MimeType,
        d.FileSize,
        d.Module,
        d.EntityType,
        d.EntitySysId,
        d.DocumentTypeSysId,
        d.DocumentType?.Name,
        d.UploadedBySysId,
        $"{d.UploadedBy.FirstName} {d.UploadedBy.LastName}",
        d.CreateTimestamp,
        d.ModifyTimestamp
    );

    private static string GetMimeType(string extension) => extension.ToLowerInvariant() switch
    {
        ".pdf" => "application/pdf",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls" => "application/vnd.ms-excel",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".txt" => "text/plain",
        _ => "application/octet-stream",
    };
}
