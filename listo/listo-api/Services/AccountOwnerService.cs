using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IAccountOwnerService
{
    Task<IEnumerable<AccountOwnerResponse>> GetAllAsync(bool includeDeleted = false);
    Task<AccountOwnerResponse?> GetByIdAsync(long id);
    Task<AccountOwnerResponse> CreateAsync(CreateAccountOwnerRequest request);
    Task<AccountOwnerResponse?> UpdateAsync(long id, UpdateAccountOwnerRequest request);
    Task<bool> SoftDeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
}

public class AccountOwnerService : IAccountOwnerService
{
    private readonly ListoDbContext _context;

    public AccountOwnerService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AccountOwnerResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.AccountOwners.AsQueryable();
        if (!includeDeleted)
            query = query.Where(o => !o.IsDeleted);

        return await query
            .Select(o => new AccountOwnerResponse(
                o.SysId,
                o.Name,
                o.IsDeleted,
                o.Accounts.Count
            ))
            .ToListAsync();
    }

    public async Task<AccountOwnerResponse?> GetByIdAsync(long id)
    {
        var owner = await _context.AccountOwners
            .Include(o => o.Accounts)
            .FirstOrDefaultAsync(o => o.SysId == id);

        return owner == null ? null : new AccountOwnerResponse(
            owner.SysId,
            owner.Name,
            owner.IsDeleted,
            owner.Accounts.Count
        );
    }

    public async Task<AccountOwnerResponse> CreateAsync(CreateAccountOwnerRequest request)
    {
        if (await _context.AccountOwners.AnyAsync(o => o.Name == request.Name))
            throw new InvalidOperationException("Account owner with this name already exists");

        var owner = new AccountOwner { Name = request.Name };
        _context.AccountOwners.Add(owner);
        await _context.SaveChangesAsync();

        return new AccountOwnerResponse(owner.SysId, owner.Name, owner.IsDeleted, 0);
    }

    public async Task<AccountOwnerResponse?> UpdateAsync(long id, UpdateAccountOwnerRequest request)
    {
        var owner = await _context.AccountOwners
            .Include(o => o.Accounts)
            .FirstOrDefaultAsync(o => o.SysId == id);

        if (owner == null) return null;

        if (request.Name != null)
        {
            if (await _context.AccountOwners.AnyAsync(o => o.Name == request.Name && o.SysId != id))
                throw new InvalidOperationException("Account owner with this name already exists");
            owner.Name = request.Name;
        }

        await _context.SaveChangesAsync();
        return new AccountOwnerResponse(owner.SysId, owner.Name, owner.IsDeleted, owner.Accounts.Count);
    }

    public async Task<bool> SoftDeleteAsync(long id)
    {
        var owner = await _context.AccountOwners.FindAsync(id);
        if (owner == null) return false;

        owner.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var owner = await _context.AccountOwners.FindAsync(id);
        if (owner == null) return false;

        owner.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var owner = await _context.AccountOwners
            .Include(o => o.Accounts)
            .FirstOrDefaultAsync(o => o.SysId == id);

        if (owner == null) return false;
        if (owner.Accounts.Count > 0)
            throw new InvalidOperationException("Cannot purge account owner that has associated accounts");

        _context.AccountOwners.Remove(owner);
        await _context.SaveChangesAsync();
        return true;
    }
}
