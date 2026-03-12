using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface IDocumentTypeService
{
    Task<IEnumerable<DocumentTypeResponse>> GetAllAsync(string module, bool includeDeleted = false);
    Task<DocumentTypeResponse?> GetByIdAsync(long id);
    Task<DocumentTypeResponse> CreateAsync(string module, CreateDocumentTypeRequest request);
    Task<DocumentTypeResponse?> UpdateAsync(string module, long id, UpdateDocumentTypeRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(string module, long id);
    Task<bool> PurgeAsync(long id);
}

public class DocumentTypeService : IDocumentTypeService
{
    private readonly ListoDbContext _context;

    public DocumentTypeService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DocumentTypeResponse>> GetAllAsync(string module, bool includeDeleted = false)
    {
        var query = _context.DocumentTypes.Where(t => t.Module == module);
        if (!includeDeleted)
            query = query.Where(t => !t.IsDeleted);

        return await query
            .Select(t => new DocumentTypeResponse(
                t.SysId,
                t.Name,
                t.IsDeleted,
                t.Documents.Count
            ))
            .ToListAsync();
    }

    public async Task<DocumentTypeResponse?> GetByIdAsync(long id)
    {
        var type = await _context.DocumentTypes
            .Include(t => t.Documents)
            .FirstOrDefaultAsync(t => t.SysId == id);

        return type == null ? null : new DocumentTypeResponse(
            type.SysId, type.Name, type.IsDeleted, type.Documents.Count);
    }

    public async Task<DocumentTypeResponse> CreateAsync(string module, CreateDocumentTypeRequest request)
    {
        if (await _context.DocumentTypes.AnyAsync(t => t.Name == request.Name && t.Module == module && !t.IsDeleted))
            throw new InvalidOperationException("Document type with this name already exists");

        var type = new DocumentType { Name = request.Name, Module = module };
        _context.DocumentTypes.Add(type);
        await _context.SaveChangesAsync();

        return new DocumentTypeResponse(type.SysId, type.Name, type.IsDeleted, 0);
    }

    public async Task<DocumentTypeResponse?> UpdateAsync(string module, long id, UpdateDocumentTypeRequest request)
    {
        var type = await _context.DocumentTypes
            .Include(t => t.Documents)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (type == null) return null;

        if (request.Name != null)
        {
            if (await _context.DocumentTypes.AnyAsync(t => t.Name == request.Name && t.Module == module && !t.IsDeleted && t.SysId != id))
                throw new InvalidOperationException("Document type with this name already exists");
            type.Name = request.Name;
        }

        await _context.SaveChangesAsync();

        return new DocumentTypeResponse(type.SysId, type.Name, type.IsDeleted, type.Documents.Count);
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var type = await _context.DocumentTypes.FindAsync(id);
        if (type == null) return false;

        type.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(string module, long id)
    {
        var type = await _context.DocumentTypes.FindAsync(id);
        if (type == null) return false;

        // Check if an active item with the same name already exists in this module
        if (await _context.DocumentTypes.AnyAsync(t => t.Name == type.Name && t.Module == module && !t.IsDeleted && t.SysId != id))
            throw new InvalidOperationException("Cannot restore: an active document type with this name already exists");

        type.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var type = await _context.DocumentTypes
            .Include(t => t.Documents)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (type == null) return false;
        if (type.Documents.Count > 0)
            throw new InvalidOperationException("Cannot purge document type with associated documents");

        _context.DocumentTypes.Remove(type);
        await _context.SaveChangesAsync();
        return true;
    }
}
