using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IAccountService
{
    Task<IEnumerable<AccountResponse>> GetAllAsync();
    Task<AccountResponse?> GetByIdAsync(long id);
    Task<AccountResponse> CreateAsync(CreateAccountRequest request);
    Task<AccountResponse?> UpdateAsync(long id, UpdateAccountRequest request);
    Task<bool> DeleteAsync(long id);
}

public class AccountService : IAccountService
{
    private readonly ListoDbContext _context;
    private readonly IEncryptionService _encryption;

    private static readonly string[] ValidFlags = { "Standard", "Alert", "Static", "OnHold" };

    public AccountService(ListoDbContext context, IEncryptionService encryption)
    {
        _context = context;
        _encryption = encryption;
    }

    public async Task<IEnumerable<AccountResponse>> GetAllAsync()
    {
        var accounts = await _context.Accounts
            .Include(a => a.AccountType)
            .Include(a => a.AccountOwner)
            .OrderBy(a => a.DueDate)
            .ThenBy(a => a.Name)
            .ToListAsync();

        return accounts.Select(a => MapToResponse(a, _encryption));
    }

    public async Task<AccountResponse?> GetByIdAsync(long id)
    {
        var entity = await _context.Accounts
            .Include(a => a.AccountType)
            .Include(a => a.AccountOwner)
            .FirstOrDefaultAsync(a => a.SysId == id);

        return entity == null ? null : MapToResponse(entity, _encryption);
    }

    public async Task<AccountResponse> CreateAsync(CreateAccountRequest request)
    {
        ValidateAccountFlag(request.AccountFlag);
        await ValidateForeignKeys(request.AccountTypeSysId, request.AccountOwnerSysId);

        var entity = new Account
        {
            Name = request.Name,
            AccountTypeSysId = request.AccountTypeSysId,
            AccountOwnerSysId = request.AccountOwnerSysId,
            AmountDue = request.AmountDue,
            DueDate = request.DueDate,
            AccountNumber = request.AccountNumber,
            PhoneNumber = request.PhoneNumber,
            WebAddress = request.WebAddress,
            Username = request.Username,
            EncryptedPassword = !string.IsNullOrEmpty(request.Password)
                ? _encryption.Encrypt(request.Password)
                : null,
            AutoPay = request.AutoPay,
            ResetAmountDue = request.ResetAmountDue,
            AccountFlag = request.AccountFlag
        };

        _context.Accounts.Add(entity);
        await _context.SaveChangesAsync();

        // Reload with navigation properties
        await _context.Entry(entity).Reference(a => a.AccountType).LoadAsync();
        await _context.Entry(entity).Reference(a => a.AccountOwner).LoadAsync();

        return MapToResponse(entity, _encryption);
    }

    public async Task<AccountResponse?> UpdateAsync(long id, UpdateAccountRequest request)
    {
        var entity = await _context.Accounts
            .Include(a => a.AccountType)
            .Include(a => a.AccountOwner)
            .FirstOrDefaultAsync(a => a.SysId == id);

        if (entity == null) return null;

        if (request.AccountFlag != null) ValidateAccountFlag(request.AccountFlag);
        if (request.AccountTypeSysId.HasValue || request.AccountOwnerSysId.HasValue)
        {
            await ValidateForeignKeys(
                request.AccountTypeSysId ?? entity.AccountTypeSysId,
                request.AccountOwnerSysId ?? entity.AccountOwnerSysId
            );
        }

        if (request.Name != null) entity.Name = request.Name;
        if (request.AccountTypeSysId.HasValue) entity.AccountTypeSysId = request.AccountTypeSysId.Value;
        if (request.AccountOwnerSysId.HasValue) entity.AccountOwnerSysId = request.AccountOwnerSysId.Value;
        if (request.AmountDue.HasValue) entity.AmountDue = request.AmountDue;
        if (request.DueDate.HasValue) entity.DueDate = request.DueDate;
        if (request.AccountNumber != null) entity.AccountNumber = request.AccountNumber;
        if (request.PhoneNumber != null) entity.PhoneNumber = request.PhoneNumber;
        if (request.WebAddress != null) entity.WebAddress = request.WebAddress;
        if (request.Username != null) entity.Username = request.Username;
        if (request.Password != null)
        {
            entity.EncryptedPassword = !string.IsNullOrEmpty(request.Password)
                ? _encryption.Encrypt(request.Password)
                : null;
        }
        if (request.AutoPay.HasValue) entity.AutoPay = request.AutoPay.Value;
        if (request.ResetAmountDue.HasValue) entity.ResetAmountDue = request.ResetAmountDue.Value;
        if (request.AccountFlag != null) entity.AccountFlag = request.AccountFlag;

        await _context.SaveChangesAsync();

        // Reload navigation properties if changed
        await _context.Entry(entity).Reference(a => a.AccountType).LoadAsync();
        await _context.Entry(entity).Reference(a => a.AccountOwner).LoadAsync();

        return MapToResponse(entity, _encryption);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var entity = await _context.Accounts.FindAsync(id);
        if (entity == null) return false;

        _context.Accounts.Remove(entity);
        await _context.SaveChangesAsync();
        return true;
    }

    private static void ValidateAccountFlag(string flag)
    {
        if (!ValidFlags.Contains(flag))
            throw new ArgumentException($"Invalid account flag. Must be one of: {string.Join(", ", ValidFlags)}");
    }

    private async Task ValidateForeignKeys(long accountTypeSysId, long accountOwnerSysId)
    {
        if (!await _context.AccountTypes.AnyAsync(t => t.SysId == accountTypeSysId && t.IsActive))
            throw new ArgumentException("Invalid or inactive account type");

        if (!await _context.AccountOwners.AnyAsync(o => o.SysId == accountOwnerSysId && o.IsActive))
            throw new ArgumentException("Invalid or inactive account owner");
    }

    private static AccountResponse MapToResponse(Account entity, IEncryptionService encryption) => new(
        entity.SysId,
        entity.Name,
        entity.AccountTypeSysId,
        entity.AccountType.Name,
        entity.AccountOwnerSysId,
        entity.AccountOwner.Name,
        entity.AmountDue,
        entity.DueDate,
        entity.AccountNumber,
        entity.PhoneNumber,
        entity.WebAddress,
        entity.Username,
        !string.IsNullOrEmpty(entity.EncryptedPassword)
            ? encryption.Decrypt(entity.EncryptedPassword)
            : null,
        entity.AutoPay,
        entity.ResetAmountDue,
        entity.AccountFlag
    );
}
