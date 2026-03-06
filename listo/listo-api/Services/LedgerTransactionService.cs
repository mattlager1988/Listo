using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ILedgerTransactionService
{
    Task<IEnumerable<LedgerTransactionResponse>> GetByBankAccountAsync(long bankAccountSysId);
    Task<LedgerTransactionResponse?> GetByIdAsync(long id);
    Task<LedgerTransactionResponse> CreateAsync(CreateLedgerTransactionRequest request);
    Task<LedgerTransactionResponse> CreateFromPaymentAsync(long bankAccountSysId, decimal amount, long paymentSysId, string accountName);
    Task<bool> DeleteAsync(long id);
}

public class LedgerTransactionService : ILedgerTransactionService
{
    private readonly ListoDbContext _context;
    private readonly IBankAccountService _bankAccountService;

    public LedgerTransactionService(ListoDbContext context, IBankAccountService bankAccountService)
    {
        _context = context;
        _bankAccountService = bankAccountService;
    }

    public async Task<IEnumerable<LedgerTransactionResponse>> GetByBankAccountAsync(long bankAccountSysId)
    {
        var transactions = await _context.LedgerTransactions
            .Include(t => t.BankAccount)
            .Include(t => t.Payment)
                .ThenInclude(p => p!.Account)
            .Where(t => t.BankAccountSysId == bankAccountSysId)
            .OrderByDescending(t => t.CreateTimestamp)
            .ToListAsync();

        return transactions.Select(MapToResponse);
    }

    public async Task<LedgerTransactionResponse?> GetByIdAsync(long id)
    {
        var transaction = await _context.LedgerTransactions
            .Include(t => t.BankAccount)
            .Include(t => t.Payment)
                .ThenInclude(p => p!.Account)
            .FirstOrDefaultAsync(t => t.SysId == id);

        return transaction == null ? null : MapToResponse(transaction);
    }

    public async Task<LedgerTransactionResponse> CreateAsync(CreateLedgerTransactionRequest request)
    {
        if (!Enum.TryParse<TransactionType>(request.TransactionType, out var transactionType))
            throw new ArgumentException("Invalid transaction type");

        var bankAccount = await _context.BankAccounts.FindAsync(request.BankAccountSysId);
        if (bankAccount == null)
            throw new ArgumentException("Bank account not found");

        var transaction = new LedgerTransaction
        {
            BankAccountSysId = request.BankAccountSysId,
            TransactionType = transactionType,
            Amount = request.Amount,
            Description = request.Description
        };

        _context.LedgerTransactions.Add(transaction);

        // Adjust bank account balance
        var balanceAdjustment = transactionType == TransactionType.Deposit ? request.Amount : -request.Amount;
        bankAccount.Balance += balanceAdjustment;

        await _context.SaveChangesAsync();

        await _context.Entry(transaction).Reference(t => t.BankAccount).LoadAsync();

        return MapToResponse(transaction);
    }

    public async Task<LedgerTransactionResponse> CreateFromPaymentAsync(long bankAccountSysId, decimal amount, long paymentSysId, string accountName)
    {
        var bankAccount = await _context.BankAccounts.FindAsync(bankAccountSysId);
        if (bankAccount == null)
            throw new ArgumentException("Bank account not found");

        var transaction = new LedgerTransaction
        {
            BankAccountSysId = bankAccountSysId,
            TransactionType = TransactionType.Withdrawal,
            Amount = amount,
            Description = $"Payment: {accountName}",
            PaymentSysId = paymentSysId
        };

        _context.LedgerTransactions.Add(transaction);

        // Debit the bank account
        bankAccount.Balance -= amount;

        await _context.SaveChangesAsync();

        await _context.Entry(transaction).Reference(t => t.BankAccount).LoadAsync();
        await _context.Entry(transaction).Reference(t => t.Payment).LoadAsync();
        if (transaction.Payment != null)
        {
            await _context.Entry(transaction.Payment).Reference(p => p.Account).LoadAsync();
        }

        return MapToResponse(transaction);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var transaction = await _context.LedgerTransactions
            .Include(t => t.BankAccount)
            .FirstOrDefaultAsync(t => t.SysId == id);

        if (transaction == null) return false;

        // Don't allow deleting transactions linked to payments
        if (transaction.PaymentSysId.HasValue)
            throw new InvalidOperationException("Cannot delete a transaction linked to a payment");

        // Reverse the balance adjustment
        var reverseAdjustment = transaction.TransactionType == TransactionType.Deposit
            ? -transaction.Amount
            : transaction.Amount;
        transaction.BankAccount.Balance += reverseAdjustment;

        _context.LedgerTransactions.Remove(transaction);
        await _context.SaveChangesAsync();
        return true;
    }

    private static LedgerTransactionResponse MapToResponse(LedgerTransaction transaction) => new(
        transaction.SysId,
        transaction.BankAccountSysId,
        transaction.BankAccount.Name,
        transaction.TransactionType.ToString(),
        transaction.Amount,
        transaction.Description,
        transaction.PaymentSysId,
        transaction.Payment?.Account?.Name,
        transaction.CreateTimestamp
    );
}
