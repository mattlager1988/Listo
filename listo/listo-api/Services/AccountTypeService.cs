using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IAccountTypeService
{
    Task<IEnumerable<AccountTypeResponse>> GetAllAsync(bool includeDeleted = false);
    Task<AccountTypeResponse?> GetByIdAsync(long id);
    Task<AccountTypeResponse> CreateAsync(CreateAccountTypeRequest request);
    Task<AccountTypeResponse?> UpdateAsync(long id, UpdateAccountTypeRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
}

public class AccountTypeService : IAccountTypeService
{
    private readonly ListoDbContext _context;

    public AccountTypeService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AccountTypeResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.AccountTypes.AsQueryable();
        if (!includeDeleted)
            query = query.Where(t => !t.IsDeleted);

        return await query
            .Select(t => new AccountTypeResponse(
                t.SysId,
                t.Name,
                t.IsDeleted,
                t.Accounts.Count
            ))
            .ToListAsync();
    }

    public async Task<AccountTypeResponse?> GetByIdAsync(long id)
    {
        var type = await _context.AccountTypes
            .Include(t => t.Accounts)
            .FirstOrDefaultAsync(t => t.SysId == id);

        return type == null ? null : new AccountTypeResponse(
            type.SysId,
            type.Name,
            type.IsDeleted,
            type.Accounts.Count
        );
    }

    public async Task<AccountTypeResponse> CreateAsync(CreateAccountTypeRequest request)
    {
        if (await _context.AccountTypes.AnyAsync(t => t.Name == request.Name))
            throw new InvalidOperationException("Account type with this name already exists");

        var type = new AccountType { Name = request.Name };
        _context.AccountTypes.Add(type);
        await _context.SaveChangesAsync();

        return new AccountTypeResponse(type.SysId, type.Name, type.IsDeleted, 0);
    }

    public async Task<AccountTypeResponse?> UpdateAsync(long id, UpdateAccountTypeRequest request)
    {
        var type = await _context.AccountTypes
            .Include(t => t.Accounts)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (type == null) return null;

        if (request.Name != null)
        {
            if (await _context.AccountTypes.AnyAsync(t => t.Name == request.Name && t.SysId != id))
                throw new InvalidOperationException("Account type with this name already exists");
            type.Name = request.Name;
        }

        await _context.SaveChangesAsync();
        return new AccountTypeResponse(type.SysId, type.Name, type.IsDeleted, type.Accounts.Count);
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var type = await _context.AccountTypes.FindAsync(id);
        if (type == null) return false;

        type.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var type = await _context.AccountTypes.FindAsync(id);
        if (type == null) return false;

        type.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var type = await _context.AccountTypes
            .Include(t => t.Accounts)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (type == null) return false;
        if (type.Accounts.Count > 0)
            throw new InvalidOperationException("Cannot purge account type that has associated accounts");

        _context.AccountTypes.Remove(type);
        await _context.SaveChangesAsync();
        return true;
    }
}
