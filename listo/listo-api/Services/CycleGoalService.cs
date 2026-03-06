using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ICycleGoalService
{
    Task<IEnumerable<CycleGoalResponse>> GetAllAsync(bool includeDeleted = false);
    Task<CycleGoalResponse?> GetByIdAsync(long id);
    Task<CycleGoalResponse> CreateAsync(CreateCycleGoalRequest request);
    Task<CycleGoalResponse?> UpdateAsync(long id, UpdateCycleGoalRequest request);
    Task<bool> DeleteAsync(long id);
    Task<CycleGoalResponse?> ReactivateAsync(long id);
}

public class CycleGoalService : ICycleGoalService
{
    private readonly ListoDbContext _context;

    public CycleGoalService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CycleGoalResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.CycleGoals.AsQueryable();

        if (!includeDeleted)
        {
            query = query.Where(g => !g.IsDeleted);
        }

        var goals = await query
            .Include(g => g.CyclePlans)
            .OrderBy(g => g.Name)
            .ToListAsync();

        return goals.Select(g => MapToResponse(g));
    }

    public async Task<CycleGoalResponse?> GetByIdAsync(long id)
    {
        var goal = await _context.CycleGoals
            .Include(g => g.CyclePlans)
            .FirstOrDefaultAsync(g => g.SysId == id);

        return goal == null ? null : MapToResponse(goal);
    }

    public async Task<CycleGoalResponse> CreateAsync(CreateCycleGoalRequest request)
    {
        var goal = new CycleGoal
        {
            Name = request.Name
        };

        _context.CycleGoals.Add(goal);
        await _context.SaveChangesAsync();

        return MapToResponse(goal);
    }

    public async Task<CycleGoalResponse?> UpdateAsync(long id, UpdateCycleGoalRequest request)
    {
        var goal = await _context.CycleGoals
            .Include(g => g.CyclePlans)
            .FirstOrDefaultAsync(g => g.SysId == id);

        if (goal == null) return null;

        if (request.Name != null) goal.Name = request.Name;

        await _context.SaveChangesAsync();

        return MapToResponse(goal);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var goal = await _context.CycleGoals.FindAsync(id);
        if (goal == null) return false;

        goal.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<CycleGoalResponse?> ReactivateAsync(long id)
    {
        var goal = await _context.CycleGoals
            .Include(g => g.CyclePlans)
            .FirstOrDefaultAsync(g => g.SysId == id);

        if (goal == null) return null;

        goal.IsDeleted = false;
        await _context.SaveChangesAsync();

        return MapToResponse(goal);
    }

    private static CycleGoalResponse MapToResponse(CycleGoal goal) => new(
        goal.SysId,
        goal.Name,
        goal.IsDeleted,
        goal.CyclePlans?.Count(p => !p.IsDiscontinued) ?? 0
    );
}
