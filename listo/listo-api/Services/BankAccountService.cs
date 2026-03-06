using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IBankAccountService
{
    Task<IEnumerable<BankAccountResponse>> GetAllAsync();
    Task<IEnumerable<BankAccountResponse>> GetDiscontinuedAsync();
    Task<BankAccountResponse?> GetByIdAsync(long id);
    Task<BankAccountResponse> CreateAsync(CreateBankAccountRequest request);
    Task<BankAccountResponse?> UpdateAsync(long id, UpdateBankAccountRequest request);
    Task<bool> DiscontinueAsync(long id);
    Task<BankAccountResponse?> ReactivateAsync(long id);
    Task<bool> AdjustBalanceAsync(long id, decimal amount);
}

public class BankAccountService : IBankAccountService
{
    private readonly ListoDbContext _context;

    public BankAccountService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<BankAccountResponse>> GetAllAsync()
    {
        var accounts = await _context.BankAccounts
            .Where(a => !a.IsDiscontinued)
            .OrderBy(a => a.Name)
            .ToListAsync();

        return accounts.Select(MapToResponse);
    }

    public async Task<IEnumerable<BankAccountResponse>> GetDiscontinuedAsync()
    {
        var accounts = await _context.BankAccounts
            .Where(a => a.IsDiscontinued)
            .OrderByDescending(a => a.DiscontinuedDate)
            .ToListAsync();

        return accounts.Select(MapToResponse);
    }

    public async Task<BankAccountResponse?> GetByIdAsync(long id)
    {
        var account = await _context.BankAccounts.FindAsync(id);
        return account == null ? null : MapToResponse(account);
    }

    public async Task<BankAccountResponse> CreateAsync(CreateBankAccountRequest request)
    {
        if (!Enum.TryParse<BankAccountType>(request.AccountType, out var accountType))
            throw new ArgumentException("Invalid account type");

        var account = new BankAccount
        {
            Name = request.Name,
            AccountType = accountType,
            AccountNumber = request.AccountNumber,
            RoutingNumber = request.RoutingNumber,
            Balance = request.Balance,
            Color = request.Color
        };

        _context.BankAccounts.Add(account);
        await _context.SaveChangesAsync();

        return MapToResponse(account);
    }

    public async Task<BankAccountResponse?> UpdateAsync(long id, UpdateBankAccountRequest request)
    {
        var account = await _context.BankAccounts.FindAsync(id);
        if (account == null) return null;

        if (request.Name != null) account.Name = request.Name;
        if (request.AccountType != null && Enum.TryParse<BankAccountType>(request.AccountType, out var accountType))
        {
            account.AccountType = accountType;
        }
        if (request.AccountNumber != null) account.AccountNumber = request.AccountNumber;
        if (request.RoutingNumber != null) account.RoutingNumber = request.RoutingNumber;
        if (request.Balance.HasValue) account.Balance = request.Balance.Value;
        if (request.Color != null) account.Color = request.Color;

        await _context.SaveChangesAsync();

        return MapToResponse(account);
    }

    public async Task<bool> DiscontinueAsync(long id)
    {
        var account = await _context.BankAccounts.FindAsync(id);
        if (account == null) return false;

        account.IsDiscontinued = true;
        account.DiscontinuedDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<BankAccountResponse?> ReactivateAsync(long id)
    {
        var account = await _context.BankAccounts.FindAsync(id);
        if (account == null) return null;

        account.IsDiscontinued = false;
        account.DiscontinuedDate = null;
        await _context.SaveChangesAsync();

        return MapToResponse(account);
    }

    public async Task<bool> AdjustBalanceAsync(long id, decimal amount)
    {
        var account = await _context.BankAccounts.FindAsync(id);
        if (account == null) return false;

        account.Balance += amount;
        await _context.SaveChangesAsync();
        return true;
    }

    private static BankAccountResponse MapToResponse(BankAccount account) => new(
        account.SysId,
        account.Name,
        account.AccountType.ToString(),
        account.AccountNumber,
        account.RoutingNumber,
        account.Balance,
        account.Color,
        account.IsDiscontinued,
        account.DiscontinuedDate
    );
}
