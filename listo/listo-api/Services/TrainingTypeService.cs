using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface ITrainingTypeService
{
    Task<IEnumerable<TrainingTypeResponse>> GetAllAsync(bool includeDeleted = false);
    Task<TrainingTypeResponse?> GetByIdAsync(long id);
    Task<TrainingTypeResponse> CreateAsync(CreateTrainingTypeRequest request);
    Task<TrainingTypeResponse?> UpdateAsync(long id, UpdateTrainingTypeRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
}

public class TrainingTypeService : ITrainingTypeService
{
    private readonly ListoDbContext _context;

    public TrainingTypeService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TrainingTypeResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.TrainingTypes.AsQueryable();
        if (!includeDeleted)
            query = query.Where(t => !t.IsDeleted);

        return await query
            .Select(t => new TrainingTypeResponse(
                t.SysId,
                t.Name,
                t.IsDeleted,
                t.TrainingLogs.Count
            ))
            .ToListAsync();
    }

    public async Task<TrainingTypeResponse?> GetByIdAsync(long id)
    {
        var type = await _context.TrainingTypes
            .Include(t => t.TrainingLogs)
            .FirstOrDefaultAsync(t => t.SysId == id);

        return type == null ? null : new TrainingTypeResponse(
            type.SysId, type.Name, type.IsDeleted, type.TrainingLogs.Count);
    }

    public async Task<TrainingTypeResponse> CreateAsync(CreateTrainingTypeRequest request)
    {
        if (await _context.TrainingTypes.AnyAsync(t => t.Name == request.Name))
            throw new InvalidOperationException("Training type with this name already exists");

        var type = new TrainingType { Name = request.Name };
        _context.TrainingTypes.Add(type);
        await _context.SaveChangesAsync();

        return new TrainingTypeResponse(type.SysId, type.Name, type.IsDeleted, 0);
    }

    public async Task<TrainingTypeResponse?> UpdateAsync(long id, UpdateTrainingTypeRequest request)
    {
        var type = await _context.TrainingTypes
            .Include(t => t.TrainingLogs)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (type == null) return null;

        if (request.Name != null)
        {
            if (await _context.TrainingTypes.AnyAsync(t => t.Name == request.Name && t.SysId != id))
                throw new InvalidOperationException("Training type with this name already exists");
            type.Name = request.Name;
        }

        await _context.SaveChangesAsync();

        return new TrainingTypeResponse(type.SysId, type.Name, type.IsDeleted, type.TrainingLogs.Count);
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var type = await _context.TrainingTypes.FindAsync(id);
        if (type == null) return false;

        type.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var type = await _context.TrainingTypes.FindAsync(id);
        if (type == null) return false;

        type.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var type = await _context.TrainingTypes
            .Include(t => t.TrainingLogs)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (type == null) return false;
        if (type.TrainingLogs.Count > 0)
            throw new InvalidOperationException("Cannot purge training type with associated training logs");

        _context.TrainingTypes.Remove(type);
        await _context.SaveChangesAsync();
        return true;
    }
}
