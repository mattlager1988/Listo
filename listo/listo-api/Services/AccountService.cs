using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IAccountService
{
    Task<IEnumerable<AccountResponse>> GetAllAccountsAsync();
    Task<AccountResponse?> GetAccountByIdAsync(long id);
    Task<AccountResponse> CreateAccountAsync(CreateAccountRequest request);
    Task<AccountResponse?> UpdateAccountAsync(long id, UpdateAccountRequest request);
    Task<bool> DeleteAccountAsync(long id);
}

public class AccountService : IAccountService
{
    private readonly ListoDbContext _context;
    private readonly IEncryptionService _encryptionService;

    public AccountService(ListoDbContext context, IEncryptionService encryptionService)
    {
        _context = context;
        _encryptionService = encryptionService;
    }

    public async Task<IEnumerable<AccountResponse>> GetAllAccountsAsync()
    {
        var accounts = await _context.Accounts
            .Include(a => a.AccountType)
            .Include(a => a.AccountOwner)
            .ToListAsync();

        return accounts.Select(a => MapToResponse(a));
    }

    public async Task<AccountResponse?> GetAccountByIdAsync(long id)
    {
        var account = await _context.Accounts
            .Include(a => a.AccountType)
            .Include(a => a.AccountOwner)
            .FirstOrDefaultAsync(a => a.SysId == id);
        return account == null ? null : MapToResponse(account);
    }

    public async Task<AccountResponse> CreateAccountAsync(CreateAccountRequest request)
    {
        if (!Enum.TryParse<AccountFlag>(request.AccountFlag, out var flag))
            throw new ArgumentException("Invalid account flag");

        var account = new Account
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
            EncryptedPassword = string.IsNullOrEmpty(request.Password)
                ? null
                : _encryptionService.Encrypt(request.Password),
            AutoPay = request.AutoPay,
            ResetAmountDue = request.ResetAmountDue,
            AccountFlag = flag,
            Notes = request.Notes
        };

        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        await _context.Entry(account).Reference(a => a.AccountType).LoadAsync();
        await _context.Entry(account).Reference(a => a.AccountOwner).LoadAsync();

        return MapToResponse(account);
    }

    public async Task<AccountResponse?> UpdateAccountAsync(long id, UpdateAccountRequest request)
    {
        var account = await _context.Accounts
            .Include(a => a.AccountType)
            .Include(a => a.AccountOwner)
            .FirstOrDefaultAsync(a => a.SysId == id);

        if (account == null) return null;

        if (request.Name != null) account.Name = request.Name;
        if (request.AccountTypeSysId.HasValue) account.AccountTypeSysId = request.AccountTypeSysId.Value;
        if (request.AccountOwnerSysId.HasValue) account.AccountOwnerSysId = request.AccountOwnerSysId.Value;
        if (request.AmountDue.HasValue) account.AmountDue = request.AmountDue.Value;
        if (request.DueDate.HasValue) account.DueDate = request.DueDate.Value;
        if (request.AccountNumber != null) account.AccountNumber = request.AccountNumber;
        if (request.PhoneNumber != null) account.PhoneNumber = request.PhoneNumber;
        if (request.WebAddress != null) account.WebAddress = request.WebAddress;
        if (request.Username != null) account.Username = request.Username;
        if (request.Password != null)
        {
            account.EncryptedPassword = string.IsNullOrEmpty(request.Password)
                ? null
                : _encryptionService.Encrypt(request.Password);
        }
        if (request.AutoPay.HasValue) account.AutoPay = request.AutoPay.Value;
        if (request.ResetAmountDue.HasValue) account.ResetAmountDue = request.ResetAmountDue.Value;
        if (request.AccountFlag != null && Enum.TryParse<AccountFlag>(request.AccountFlag, out var flag))
        {
            account.AccountFlag = flag;
        }
        if (request.Notes != null) account.Notes = request.Notes;

        await _context.SaveChangesAsync();

        await _context.Entry(account).Reference(a => a.AccountType).LoadAsync();
        await _context.Entry(account).Reference(a => a.AccountOwner).LoadAsync();

        return MapToResponse(account);
    }

    public async Task<bool> DeleteAccountAsync(long id)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account == null) return false;

        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();
        return true;
    }

    private AccountResponse MapToResponse(Account account) => new(
        account.SysId,
        account.Name,
        account.AccountTypeSysId,
        account.AccountType.Name,
        account.AccountOwnerSysId,
        account.AccountOwner.Name,
        account.AmountDue,
        account.DueDate,
        account.AccountNumber,
        account.PhoneNumber,
        account.WebAddress,
        account.Username,
        string.IsNullOrEmpty(account.EncryptedPassword)
            ? null
            : _encryptionService.Decrypt(account.EncryptedPassword),
        account.AutoPay,
        account.ResetAmountDue,
        account.AccountFlag.ToString(),
        account.Notes
    );
}
