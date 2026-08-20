using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Listo.Api.Services;

public interface IPeriodLogService
{
    Task<IEnumerable<PeriodLogResponse>> GetAllAsync(long userId);
    Task<PeriodLogResponse?> GetByIdAsync(long id, long userId);
    Task<PeriodLogResponse> CreateAsync(CreatePeriodLogRequest request, long userId);
    Task<PeriodLogResponse?> UpdateAsync(long id, UpdatePeriodLogRequest request, long userId);
    Task<bool> DeleteAsync(long id, long userId);
    Task<PeriodStatsResponse> GetStatsAsync(long userId);

    // Log records ("entries") within a period.
    Task<IEnumerable<PeriodLogEntryResponse>?> GetEntriesAsync(long periodId, long userId);
    Task<PeriodLogEntryResponse?> CreateEntryAsync(CreatePeriodLogEntryRequest request, long userId);
    Task<PeriodLogEntryResponse?> UpdateEntryAsync(long entryId, UpdatePeriodLogEntryRequest request, long userId);
    Task<bool> DeleteEntryAsync(long entryId, long userId);
}

public class PeriodLogService : IPeriodLogService
{
    private readonly ListoDbContext _context;

    public PeriodLogService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PeriodLogResponse>> GetAllAsync(long userId)
    {
        var logs = await _context.PeriodLogs
            .Where(p => p.UserSysId == userId)
            .Include(p => p.Entries)
                .ThenInclude(e => e.EntryType)
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();

        return logs.Select(MapToResponse).ToList();
    }

    public async Task<PeriodLogResponse?> GetByIdAsync(long id, long userId)
    {
        var log = await _context.PeriodLogs
            .Include(p => p.Entries)
                .ThenInclude(e => e.EntryType)
            .FirstOrDefaultAsync(p => p.SysId == id && p.UserSysId == userId);

        return log == null ? null : MapToResponse(log);
    }

    public async Task<PeriodLogResponse> CreateAsync(CreatePeriodLogRequest request, long userId)
    {
        var log = new PeriodLog
        {
            StartDate = request.StartDate,
            PreWeekStartDate = request.PreWeekStartDate,
            IsStartDateEstimated = request.IsStartDateEstimated,
            Notes = request.Notes,
            UserSysId = userId,
        };

        _context.PeriodLogs.Add(log);
        await _context.SaveChangesAsync();

        return MapToResponse(log);
    }

    public async Task<PeriodLogResponse?> UpdateAsync(long id, UpdatePeriodLogRequest request, long userId)
    {
        var log = await _context.PeriodLogs
            .Include(p => p.Entries)
                .ThenInclude(e => e.EntryType)
            .FirstOrDefaultAsync(p => p.SysId == id && p.UserSysId == userId);

        if (log == null) return null;

        if (request.StartDate.HasValue) log.StartDate = request.StartDate.Value;
        if (request.PreWeekStartDate.HasValue) log.PreWeekStartDate = request.PreWeekStartDate.Value;
        if (request.IsStartDateEstimated.HasValue) log.IsStartDateEstimated = request.IsStartDateEstimated.Value;
        if (request.Notes != null) log.Notes = request.Notes;

        await _context.SaveChangesAsync();

        return MapToResponse(log);
    }

    public async Task<bool> DeleteAsync(long id, long userId)
    {
        var log = await _context.PeriodLogs
            .FirstOrDefaultAsync(p => p.SysId == id && p.UserSysId == userId);

        if (log == null) return false;

        _context.PeriodLogs.Remove(log);
        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<PeriodStatsResponse> GetStatsAsync(long userId)
    {
        var dates = await _context.PeriodLogs
            .Where(p => p.UserSysId == userId)
            .OrderBy(p => p.StartDate)
            .Select(p => p.StartDate)
            .ToListAsync();

        if (dates.Count == 0)
            return new PeriodStatsResponse(null, null, null, 0);

        var last = dates[^1];
        if (dates.Count < 2)
            return new PeriodStatsResponse(last, null, null, dates.Count);

        // Average gap = total span / number of intervals
        var avgDays = (dates[^1] - dates[0]).TotalDays / (dates.Count - 1);
        var next = last.AddDays(avgDays);
        return new PeriodStatsResponse(last, next, avgDays, dates.Count);
    }

    public async Task<IEnumerable<PeriodLogEntryResponse>?> GetEntriesAsync(long periodId, long userId)
    {
        var ownsPeriod = await _context.PeriodLogs
            .AnyAsync(p => p.SysId == periodId && p.UserSysId == userId);
        if (!ownsPeriod) return null;

        var entries = await _context.PeriodLogEntries
            .Where(e => e.PeriodLogSysId == periodId)
            .Include(e => e.EntryType)
            .OrderBy(e => e.EntryDate)
            .ToListAsync();

        return entries.Select(MapEntryToResponse).ToList();
    }

    public async Task<PeriodLogEntryResponse?> CreateEntryAsync(CreatePeriodLogEntryRequest request, long userId)
    {
        var ownsPeriod = await _context.PeriodLogs
            .AnyAsync(p => p.SysId == request.PeriodLogSysId && p.UserSysId == userId);
        if (!ownsPeriod) return null;

        var typeExists = await _context.PeriodLogEntryTypes
            .AnyAsync(t => t.SysId == request.EntryTypeSysId && !t.IsDeleted);
        if (!typeExists) throw new ArgumentException("Invalid log record type");

        var entry = new PeriodLogEntry
        {
            PeriodLogSysId = request.PeriodLogSysId,
            EntryTypeSysId = request.EntryTypeSysId,
            EntryDate = request.EntryDate,
            Notes = request.Notes,
        };

        _context.PeriodLogEntries.Add(entry);
        await _context.SaveChangesAsync();

        // Load the type name for the response
        await _context.Entry(entry).Reference(e => e.EntryType).LoadAsync();
        return MapEntryToResponse(entry);
    }

    public async Task<PeriodLogEntryResponse?> UpdateEntryAsync(long entryId, UpdatePeriodLogEntryRequest request, long userId)
    {
        var entry = await _context.PeriodLogEntries
            .Include(e => e.PeriodLog)
            .Include(e => e.EntryType)
            .FirstOrDefaultAsync(e => e.SysId == entryId && e.PeriodLog.UserSysId == userId);

        if (entry == null) return null;

        if (request.EntryTypeSysId.HasValue)
        {
            var typeExists = await _context.PeriodLogEntryTypes
                .AnyAsync(t => t.SysId == request.EntryTypeSysId.Value && !t.IsDeleted);
            if (!typeExists) throw new ArgumentException("Invalid log record type");
            entry.EntryTypeSysId = request.EntryTypeSysId.Value;
        }
        if (request.EntryDate.HasValue) entry.EntryDate = request.EntryDate.Value;
        if (request.Notes != null) entry.Notes = request.Notes;

        await _context.SaveChangesAsync();

        await _context.Entry(entry).Reference(e => e.EntryType).LoadAsync();
        return MapEntryToResponse(entry);
    }

    public async Task<bool> DeleteEntryAsync(long entryId, long userId)
    {
        var entry = await _context.PeriodLogEntries
            .Include(e => e.PeriodLog)
            .FirstOrDefaultAsync(e => e.SysId == entryId && e.PeriodLog.UserSysId == userId);

        if (entry == null) return false;

        _context.PeriodLogEntries.Remove(entry);
        await _context.SaveChangesAsync();

        return true;
    }

    private static PeriodLogResponse MapToResponse(PeriodLog p) => new(
        p.SysId,
        p.StartDate,
        p.PreWeekStartDate,
        p.IsStartDateEstimated,
        p.Notes,
        p.Entries
            .OrderBy(e => e.EntryDate)
            .Select(MapEntryToResponse)
            .ToList(),
        p.CreateTimestamp,
        p.ModifyTimestamp
    );

    private static PeriodLogEntryResponse MapEntryToResponse(PeriodLogEntry e) => new(
        e.SysId,
        e.PeriodLogSysId,
        e.EntryTypeSysId,
        e.EntryType?.Name ?? string.Empty,
        e.EntryDate,
        e.Notes,
        e.CreateTimestamp,
        e.ModifyTimestamp
    );
}
