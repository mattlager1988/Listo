using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ICyclePlanService
{
    Task<IEnumerable<CyclePlanResponse>> GetAllAsync();
    Task<IEnumerable<CyclePlanResponse>> GetDiscontinuedAsync();
    Task<CyclePlanResponse?> GetByIdAsync(long id);
    Task<CyclePlanResponse> CreateAsync(CreateCyclePlanRequest request);
    Task<CyclePlanResponse?> UpdateAsync(long id, UpdateCyclePlanRequest request);
    Task<bool> DiscontinueAsync(long id);
    Task<CyclePlanResponse?> ReactivateAsync(long id);
}

public class CyclePlanService : ICyclePlanService
{
    private readonly ListoDbContext _context;

    public CyclePlanService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CyclePlanResponse>> GetAllAsync()
    {
        var plans = await _context.CyclePlans
            .Include(p => p.CycleGoal)
            .Where(p => !p.IsDiscontinued)
            .OrderByDescending(p => p.StartDate)
            .ToListAsync();

        return plans.Select(p => MapToResponse(p));
    }

    public async Task<IEnumerable<CyclePlanResponse>> GetDiscontinuedAsync()
    {
        var plans = await _context.CyclePlans
            .Include(p => p.CycleGoal)
            .Where(p => p.IsDiscontinued)
            .OrderByDescending(p => p.DiscontinuedDate)
            .ToListAsync();

        return plans.Select(p => MapToResponse(p));
    }

    public async Task<CyclePlanResponse?> GetByIdAsync(long id)
    {
        var plan = await _context.CyclePlans
            .Include(p => p.CycleGoal)
            .FirstOrDefaultAsync(p => p.SysId == id);

        return plan == null ? null : MapToResponse(plan);
    }

    public async Task<CyclePlanResponse> CreateAsync(CreateCyclePlanRequest request)
    {
        var plan = new CyclePlan
        {
            Name = request.Name,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            CycleGoalSysId = request.CycleGoalSysId,
            Notes = request.Notes
        };

        _context.CyclePlans.Add(plan);
        await _context.SaveChangesAsync();

        await _context.Entry(plan).Reference(p => p.CycleGoal).LoadAsync();

        return MapToResponse(plan);
    }

    public async Task<CyclePlanResponse?> UpdateAsync(long id, UpdateCyclePlanRequest request)
    {
        var plan = await _context.CyclePlans
            .Include(p => p.CycleGoal)
            .FirstOrDefaultAsync(p => p.SysId == id);

        if (plan == null) return null;

        if (request.Name != null) plan.Name = request.Name;
        if (request.StartDate.HasValue) plan.StartDate = request.StartDate.Value;
        if (request.EndDate.HasValue) plan.EndDate = request.EndDate.Value;
        if (request.CycleGoalSysId.HasValue) plan.CycleGoalSysId = request.CycleGoalSysId.Value;
        if (request.Notes != null) plan.Notes = request.Notes;

        await _context.SaveChangesAsync();

        await _context.Entry(plan).Reference(p => p.CycleGoal).LoadAsync();

        return MapToResponse(plan);
    }

    public async Task<bool> DiscontinueAsync(long id)
    {
        var plan = await _context.CyclePlans.FindAsync(id);
        if (plan == null) return false;

        plan.IsDiscontinued = true;
        plan.DiscontinuedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<CyclePlanResponse?> ReactivateAsync(long id)
    {
        var plan = await _context.CyclePlans
            .Include(p => p.CycleGoal)
            .FirstOrDefaultAsync(p => p.SysId == id);

        if (plan == null) return null;

        plan.IsDiscontinued = false;
        plan.DiscontinuedDate = null;
        await _context.SaveChangesAsync();

        return MapToResponse(plan);
    }

    private static CyclePlanResponse MapToResponse(CyclePlan plan) => new(
        plan.SysId,
        plan.Name,
        plan.StartDate,
        plan.EndDate,
        plan.CycleGoalSysId,
        plan.CycleGoal.Name,
        plan.Notes,
        plan.IsDiscontinued,
        plan.DiscontinuedDate
    );
}
