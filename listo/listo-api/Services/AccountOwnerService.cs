using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IAccountOwnerService
{
    Task<IEnumerable<ListItemResponse>> GetAllAsync(bool includeInactive = false);
    Task<ListItemResponse?> GetByIdAsync(long id);
    Task<ListItemResponse> CreateAsync(CreateListItemRequest request);
    Task<ListItemResponse?> UpdateAsync(long id, UpdateListItemRequest request);
    Task<bool> DeleteAsync(long id);
}

public class AccountOwnerService : IAccountOwnerService
{
    private readonly ListoDbContext _context;

    public AccountOwnerService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ListItemResponse>> GetAllAsync(bool includeInactive = false)
    {
        var query = _context.AccountOwners.AsQueryable();
        if (!includeInactive)
            query = query.Where(o => o.IsActive);

        return await query
            .OrderBy(o => o.SortOrder)
            .ThenBy(o => o.Name)
            .Select(o => MapToResponse(o))
            .ToListAsync();
    }

    public async Task<ListItemResponse?> GetByIdAsync(long id)
    {
        var entity = await _context.AccountOwners.FindAsync(id);
        return entity == null ? null : MapToResponse(entity);
    }

    public async Task<ListItemResponse> CreateAsync(CreateListItemRequest request)
    {
        if (await _context.AccountOwners.AnyAsync(o => o.Name == request.Name))
            throw new InvalidOperationException("Account owner with this name already exists");

        var entity = new AccountOwner
        {
            Name = request.Name,
            Description = request.Description,
            IsActive = request.IsActive,
            SortOrder = request.SortOrder
        };

        _context.AccountOwners.Add(entity);
        await _context.SaveChangesAsync();

        return MapToResponse(entity);
    }

    public async Task<ListItemResponse?> UpdateAsync(long id, UpdateListItemRequest request)
    {
        var entity = await _context.AccountOwners.FindAsync(id);
        if (entity == null) return null;

        if (request.Name != null)
        {
            if (await _context.AccountOwners.AnyAsync(o => o.Name == request.Name && o.SysId != id))
                throw new InvalidOperationException("Account owner with this name already exists");
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
        var entity = await _context.AccountOwners.FindAsync(id);
        if (entity == null) return false;

        // Check if in use
        if (await _context.Accounts.AnyAsync(a => a.AccountOwnerSysId == id))
            throw new InvalidOperationException("Cannot delete account owner that is in use");

        _context.AccountOwners.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    private static ListItemResponse MapToResponse(AccountOwner entity) => new(
        entity.SysId,
        entity.Name,
        entity.Description,
        entity.IsActive,
        entity.SortOrder
    );
}
