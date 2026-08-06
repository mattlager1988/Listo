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
        return await _context.PeriodLogs
            .Where(p => p.UserSysId == userId)
            .OrderByDescending(p => p.StartDate)
            .Select(p => MapToResponse(p))
            .ToListAsync();
    }

    public async Task<PeriodLogResponse?> GetByIdAsync(long id, long userId)
    {
        var log = await _context.PeriodLogs
            .FirstOrDefaultAsync(p => p.SysId == id && p.UserSysId == userId);

        return log == null ? null : MapToResponse(log);
    }

    public async Task<PeriodLogResponse> CreateAsync(CreatePeriodLogRequest request, long userId)
    {
        Validate(request.PainSeverity, request.Mood);

        var log = new PeriodLog
        {
            StartDate = request.StartDate,
            PainSeverity = request.PainSeverity,
            Mood = request.Mood,
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
            .FirstOrDefaultAsync(p => p.SysId == id && p.UserSysId == userId);

        if (log == null) return null;

        Validate(request.PainSeverity, request.Mood);

        if (request.StartDate.HasValue) log.StartDate = request.StartDate.Value;
        if (request.PainSeverity.HasValue) log.PainSeverity = request.PainSeverity.Value;
        if (request.Mood.HasValue) log.Mood = request.Mood.Value;
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

    private static void Validate(int? pain, int? mood)
    {
        if (pain is < 1 or > 5) throw new ArgumentException("Pain severity must be between 1 and 5");
        if (mood is < 1 or > 5) throw new ArgumentException("Mood must be between 1 and 5");
    }

    private static PeriodLogResponse MapToResponse(PeriodLog p) => new(
        p.SysId,
        p.StartDate,
        p.PainSeverity,
        p.Mood,
        p.Notes,
        p.CreateTimestamp,
        p.ModifyTimestamp
    );
}
