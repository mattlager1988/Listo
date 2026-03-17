using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IPasswordCategoryService
{
    Task<IEnumerable<PasswordCategoryResponse>> GetAllAsync(bool includeDeleted = false);
    Task<PasswordCategoryResponse?> GetByIdAsync(long id);
    Task<PasswordCategoryResponse> CreateAsync(CreatePasswordCategoryRequest request);
    Task<PasswordCategoryResponse?> UpdateAsync(long id, UpdatePasswordCategoryRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
}

public class PasswordCategoryService : IPasswordCategoryService
{
    private readonly ListoDbContext _context;

    public PasswordCategoryService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PasswordCategoryResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.PasswordCategories.AsQueryable();
        if (!includeDeleted)
            query = query.Where(t => !t.IsDeleted);

        return await query
            .Select(t => new PasswordCategoryResponse(
                t.SysId,
                t.Name,
                t.IsDeleted,
                t.PasswordEntries.Count
            ))
            .ToListAsync();
    }

    public async Task<PasswordCategoryResponse?> GetByIdAsync(long id)
    {
        var category = await _context.PasswordCategories
            .Include(t => t.PasswordEntries)
            .FirstOrDefaultAsync(t => t.SysId == id);

        return category == null ? null : new PasswordCategoryResponse(
            category.SysId,
            category.Name,
            category.IsDeleted,
            category.PasswordEntries.Count
        );
    }

    public async Task<PasswordCategoryResponse> CreateAsync(CreatePasswordCategoryRequest request)
    {
        if (await _context.PasswordCategories.AnyAsync(t => t.Name == request.Name && !t.IsDeleted))
            throw new InvalidOperationException("Password category with this name already exists");

        var category = new PasswordCategory { Name = request.Name };
        _context.PasswordCategories.Add(category);
        await _context.SaveChangesAsync();

        return new PasswordCategoryResponse(category.SysId, category.Name, category.IsDeleted, 0);
    }

    public async Task<PasswordCategoryResponse?> UpdateAsync(long id, UpdatePasswordCategoryRequest request)
    {
        var category = await _context.PasswordCategories
            .Include(t => t.PasswordEntries)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (category == null) return null;

        if (request.Name != null)
        {
            if (await _context.PasswordCategories.AnyAsync(t => t.Name == request.Name && !t.IsDeleted && t.SysId != id))
                throw new InvalidOperationException("Password category with this name already exists");
            category.Name = request.Name;
        }

        await _context.SaveChangesAsync();
        return new PasswordCategoryResponse(category.SysId, category.Name, category.IsDeleted, category.PasswordEntries.Count);
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var category = await _context.PasswordCategories.FindAsync(id);
        if (category == null) return false;

        category.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var category = await _context.PasswordCategories.FindAsync(id);
        if (category == null) return false;

        if (await _context.PasswordCategories.AnyAsync(t => t.Name == category.Name && !t.IsDeleted && t.SysId != id))
            throw new InvalidOperationException("Cannot restore: an active password category with this name already exists");

        category.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var category = await _context.PasswordCategories
            .Include(t => t.PasswordEntries)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (category == null) return false;
        if (category.PasswordEntries.Count > 0)
            throw new InvalidOperationException("Cannot purge password category that has associated password entries");

        _context.PasswordCategories.Remove(category);
        await _context.SaveChangesAsync();
        return true;
    }
}
