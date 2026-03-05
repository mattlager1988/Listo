using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface IAircraftService
{
    Task<IEnumerable<AircraftResponse>> GetAllAsync(bool includeDeleted = false);
    Task<AircraftResponse?> GetByIdAsync(long id);
    Task<AircraftResponse> CreateAsync(CreateAircraftRequest request);
    Task<AircraftResponse?> UpdateAsync(long id, UpdateAircraftRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
}

public class AircraftService : IAircraftService
{
    private readonly ListoDbContext _context;

    public AircraftService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AircraftResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.Aircraft.AsQueryable();
        if (!includeDeleted)
            query = query.Where(a => !a.IsDeleted);

        return await query
            .Select(a => new AircraftResponse(
                a.SysId,
                a.PlaneId,
                a.Name,
                a.IsDeleted,
                a.TrainingLogs.Count
            ))
            .ToListAsync();
    }

    public async Task<AircraftResponse?> GetByIdAsync(long id)
    {
        var aircraft = await _context.Aircraft
            .Include(a => a.TrainingLogs)
            .FirstOrDefaultAsync(a => a.SysId == id);

        return aircraft == null ? null : new AircraftResponse(
            aircraft.SysId, aircraft.PlaneId, aircraft.Name, aircraft.IsDeleted, aircraft.TrainingLogs.Count);
    }

    public async Task<AircraftResponse> CreateAsync(CreateAircraftRequest request)
    {
        if (await _context.Aircraft.AnyAsync(a => a.PlaneId == request.PlaneId && !a.IsDeleted))
            throw new InvalidOperationException("Aircraft with this plane ID already exists");

        var aircraft = new Aircraft { PlaneId = request.PlaneId, Name = request.Name };
        _context.Aircraft.Add(aircraft);
        await _context.SaveChangesAsync();

        return new AircraftResponse(aircraft.SysId, aircraft.PlaneId, aircraft.Name, aircraft.IsDeleted, 0);
    }

    public async Task<AircraftResponse?> UpdateAsync(long id, UpdateAircraftRequest request)
    {
        var aircraft = await _context.Aircraft
            .Include(a => a.TrainingLogs)
            .FirstOrDefaultAsync(a => a.SysId == id);

        if (aircraft == null) return null;

        if (request.PlaneId != null)
        {
            if (await _context.Aircraft.AnyAsync(a => a.PlaneId == request.PlaneId && !a.IsDeleted && a.SysId != id))
                throw new InvalidOperationException("Aircraft with this plane ID already exists");
            aircraft.PlaneId = request.PlaneId;
        }

        if (request.Name != null)
            aircraft.Name = request.Name;

        await _context.SaveChangesAsync();

        return new AircraftResponse(aircraft.SysId, aircraft.PlaneId, aircraft.Name, aircraft.IsDeleted, aircraft.TrainingLogs.Count);
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var aircraft = await _context.Aircraft.FindAsync(id);
        if (aircraft == null) return false;

        aircraft.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var aircraft = await _context.Aircraft.FindAsync(id);
        if (aircraft == null) return false;

        // Check if an active item with the same plane ID already exists
        if (await _context.Aircraft.AnyAsync(a => a.PlaneId == aircraft.PlaneId && !a.IsDeleted && a.SysId != id))
            throw new InvalidOperationException("Cannot restore: an active aircraft with this plane ID already exists");

        aircraft.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var aircraft = await _context.Aircraft
            .Include(a => a.TrainingLogs)
            .FirstOrDefaultAsync(a => a.SysId == id);

        if (aircraft == null) return false;
        if (aircraft.TrainingLogs.Count > 0)
            throw new InvalidOperationException("Cannot purge aircraft with associated training logs");

        _context.Aircraft.Remove(aircraft);
        await _context.SaveChangesAsync();
        return true;
    }
}
