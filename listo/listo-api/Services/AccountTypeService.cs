using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IAccountTypeService
{
    Task<IEnumerable<ListItemResponse>> GetAllAsync(bool includeInactive = false);
    Task<ListItemResponse?> GetByIdAsync(long id);
    Task<ListItemResponse> CreateAsync(CreateListItemRequest request);
    Task<ListItemResponse?> UpdateAsync(long id, UpdateListItemRequest request);
    Task<bool> DeleteAsync(long id);
}

public class AccountTypeService : IAccountTypeService
{
    private readonly ListoDbContext _context;

    public AccountTypeService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ListItemResponse>> GetAllAsync(bool includeInactive = false)
    {
        var query = _context.AccountTypes.AsQueryable();
        if (!includeInactive)
            query = query.Where(t => t.IsActive);

        return await query
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.Name)
            .Select(t => MapToResponse(t))
            .ToListAsync();
    }

    public async Task<ListItemResponse?> GetByIdAsync(long id)
    {
        var entity = await _context.AccountTypes.FindAsync(id);
        return entity == null ? null : MapToResponse(entity);
    }

    public async Task<ListItemResponse> CreateAsync(CreateListItemRequest request)
    {
        if (await _context.AccountTypes.AnyAsync(t => t.Name == request.Name))
            throw new InvalidOperationException("Account type with this name already exists");

        var entity = new AccountType
        {
            Name = request.Name,
            Description = request.Description,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder
        };

        _context.AccountTypes.Add(entity);
        await _context.SaveChangesAsync();

        return MapToResponse(entity);
    }

    public async Task<ListItemResponse?> UpdateAsync(long id, UpdateListItemRequest request)
    {
        var entity = await _context.AccountTypes.FindAsync(id);
        if (entity == null) return null;

        if (request.Name != null)
        {
            if (await _context.AccountTypes.AnyAsync(t => t.Name == request.Name && t.SysId != id))
                throw new InvalidOperationException("Account type with this name already exists");
            entity.Name = request.Name;
        }
        if (request.Description != null) entity.Description = request.Description;
        if (request.IsActive.HasValue) entity.IsActive = request.IsActive.Value;
        if (request.SortOrder.HasValue) entity.SortOrder = request.SortOrder.Value;

        await _context.SaveChangesAsync();
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var entity = await _context.AccountTypes.FindAsync(id);
        if (entity == null) return false;

        // Check if in use
        if (await _context.Accounts.AnyAsync(a => a.AccountTypeSysId == id))
            throw new InvalidOperationException("Cannot delete account type that is in use");

        _context.AccountTypes.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    private static ListItemResponse MapToResponse(AccountType entity) => new(
        entity.SysId,
        entity.Name,
        entity.Description,
        entity.IsActive,
        entity.SortOrder
    );
}
