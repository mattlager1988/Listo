using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface ITrainingLogService
{
    Task<IEnumerable<TrainingLogResponse>> GetAllAsync(long userId, DateTime? startDate = null, DateTime? endDate = null);
    Task<IEnumerable<TrainingLogResponse>> GetDiscontinuedAsync(long userId);
    Task<TrainingLogResponse?> GetByIdAsync(long id, long userId);
    Task<TrainingLogResponse> CreateAsync(CreateTrainingLogRequest request, long userId);
    Task<TrainingLogResponse?> UpdateAsync(long id, UpdateTrainingLogRequest request, long userId);
    Task<bool> DiscontinueAsync(long id, long userId);
    Task<TrainingLogResponse?> ReactivateAsync(long id, long userId);
    Task<TrainingLogSummary> GetSummaryAsync(long userId, DateTime? startDate = null, DateTime? endDate = null);
}

public class TrainingLogService : ITrainingLogService
{
    private readonly ListoDbContext _context;

    public TrainingLogService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<TrainingLogResponse>> GetAllAsync(long userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.TrainingLogs
            .Include(l => l.TrainingType)
            .Include(l => l.Aircraft)
            .Where(l => l.UserSysId == userId && !l.IsDiscontinued);

        if (startDate.HasValue)
            query = query.Where(l => l.Date >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(l => l.Date <= endDate.Value);

        return await query
            .OrderByDescending(l => l.Date)
            .Select(l => MapToResponse(l))
            .ToListAsync();
    }

    public async Task<IEnumerable<TrainingLogResponse>> GetDiscontinuedAsync(long userId)
    {
        return await _context.TrainingLogs
            .Include(l => l.TrainingType)
            .Include(l => l.Aircraft)
            .Where(l => l.UserSysId == userId && l.IsDiscontinued)
            .OrderByDescending(l => l.DiscontinuedDate)
            .Select(l => MapToResponse(l))
            .ToListAsync();
    }

    public async Task<TrainingLogResponse?> GetByIdAsync(long id, long userId)
    {
        var log = await _context.TrainingLogs
            .Include(l => l.TrainingType)
            .Include(l => l.Aircraft)
            .FirstOrDefaultAsync(l => l.SysId == id && l.UserSysId == userId);

        return log == null ? null : MapToResponse(log);
    }

    public async Task<TrainingLogResponse> CreateAsync(CreateTrainingLogRequest request, long userId)
    {
        var log = new TrainingLog
        {
            Date = request.Date,
            Description = request.Description,
            HoursFlown = request.HoursFlown,
            TrainingTypeSysId = request.TrainingTypeSysId,
            AircraftSysId = request.AircraftSysId,
            UserSysId = userId,
        };

        _context.TrainingLogs.Add(log);
        await _context.SaveChangesAsync();

        // Load navigation properties
        await _context.Entry(log).Reference(l => l.TrainingType).LoadAsync();
        if (log.AircraftSysId.HasValue)
            await _context.Entry(log).Reference(l => l.Aircraft).LoadAsync();

        return MapToResponse(log);
    }

    public async Task<TrainingLogResponse?> UpdateAsync(long id, UpdateTrainingLogRequest request, long userId)
    {
        var log = await _context.TrainingLogs
            .Include(l => l.TrainingType)
            .Include(l => l.Aircraft)
            .FirstOrDefaultAsync(l => l.SysId == id && l.UserSysId == userId);

        if (log == null) return null;

        if (request.Date.HasValue) log.Date = request.Date.Value;
        if (request.Description != null) log.Description = request.Description;
        if (request.HoursFlown.HasValue) log.HoursFlown = request.HoursFlown.Value;
        if (request.TrainingTypeSysId.HasValue) log.TrainingTypeSysId = request.TrainingTypeSysId.Value;
        if (request.AircraftSysId.HasValue) log.AircraftSysId = request.AircraftSysId;

        await _context.SaveChangesAsync();

        // Reload navigation properties if changed
        await _context.Entry(log).Reference(l => l.TrainingType).LoadAsync();
        if (log.AircraftSysId.HasValue)
            await _context.Entry(log).Reference(l => l.Aircraft).LoadAsync();

        return MapToResponse(log);
    }

    public async Task<bool> DiscontinueAsync(long id, long userId)
    {
        var log = await _context.TrainingLogs
            .FirstOrDefaultAsync(l => l.SysId == id && l.UserSysId == userId);

        if (log == null) return false;

        log.IsDiscontinued = true;
        log.DiscontinuedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<TrainingLogResponse?> ReactivateAsync(long id, long userId)
    {
        var log = await _context.TrainingLogs
            .Include(l => l.TrainingType)
            .Include(l => l.Aircraft)
            .FirstOrDefaultAsync(l => l.SysId == id && l.UserSysId == userId);

        if (log == null) return null;

        log.IsDiscontinued = false;
        log.DiscontinuedDate = null;
        await _context.SaveChangesAsync();

        return MapToResponse(log);
    }

    public async Task<TrainingLogSummary> GetSummaryAsync(long userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.TrainingLogs
            .Include(l => l.TrainingType)
            .Where(l => l.UserSysId == userId && !l.IsDiscontinued);

        if (startDate.HasValue)
            query = query.Where(l => l.Date >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(l => l.Date <= endDate.Value);

        var logs = await query.ToListAsync();

        var totalHours = logs.Sum(l => l.HoursFlown);
        var totalEntries = logs.Count;
        var hoursByType = logs
            .GroupBy(l => l.TrainingType.Name)
            .ToDictionary(g => g.Key, g => g.Sum(l => l.HoursFlown));

        return new TrainingLogSummary(totalHours, totalEntries, hoursByType);
    }

    private static TrainingLogResponse MapToResponse(TrainingLog l) => new(
        l.SysId,
        l.Date,
        l.Description,
        l.HoursFlown,
        l.TrainingTypeSysId,
        l.TrainingType.Name,
        l.AircraftSysId,
        l.Aircraft?.PlaneId,
        l.Aircraft?.Name,
        l.CreateTimestamp,
        l.ModifyTimestamp,
        l.IsDiscontinued,
        l.DiscontinuedDate
    );
}
