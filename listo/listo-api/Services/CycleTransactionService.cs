using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface ICycleTransactionService
{
    Task<IEnumerable<CycleTransactionResponse>> GetByCyclePlanAsync(long cyclePlanSysId);
    Task<CycleTransactionResponse?> GetByIdAsync(long id);
    Task<CycleTransactionResponse> CreateAsync(CreateCycleTransactionRequest request);
    Task<CycleTransactionResponse?> UpdateAsync(long id, UpdateCycleTransactionRequest request);
    Task<bool> DeleteAsync(long id);
}

public class CycleTransactionService : ICycleTransactionService
{
    private readonly ListoDbContext _context;

    public CycleTransactionService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CycleTransactionResponse>> GetByCyclePlanAsync(long cyclePlanSysId)
    {
        var transactions = await _context.CycleTransactions
            .Where(t => t.CyclePlanSysId == cyclePlanSysId)
            .OrderByDescending(t => t.CreateTimestamp)
            .ToListAsync();

        return transactions.Select(MapToResponse);
    }

    public async Task<CycleTransactionResponse?> GetByIdAsync(long id)
    {
        var transaction = await _context.CycleTransactions.FindAsync(id);
        return transaction == null ? null : MapToResponse(transaction);
    }

    public async Task<CycleTransactionResponse> CreateAsync(CreateCycleTransactionRequest request)
    {
        if (!Enum.TryParse<CycleTransactionType>(request.TransactionType, out var transactionType))
            transactionType = CycleTransactionType.Credit;

        var status = CycleTransactionStatus.Estimated;
        if (request.Status != null && Enum.TryParse<CycleTransactionStatus>(request.Status, out var parsedStatus))
            status = parsedStatus;

        var transaction = new CycleTransaction
        {
            CyclePlanSysId = request.CyclePlanSysId,
            Name = request.Name,
            Amount = request.Amount,
            TransactionType = transactionType,
            Status = status,
            Notes = request.Notes
        };

        _context.CycleTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        return MapToResponse(transaction);
    }

    public async Task<CycleTransactionResponse?> UpdateAsync(long id, UpdateCycleTransactionRequest request)
    {
        var transaction = await _context.CycleTransactions.FindAsync(id);
        if (transaction == null) return null;

        if (request.Name != null) transaction.Name = request.Name;
        if (request.Amount.HasValue) transaction.Amount = request.Amount.Value;
        if (request.TransactionType != null && Enum.TryParse<CycleTransactionType>(request.TransactionType, out var transactionType))
        {
            transaction.TransactionType = transactionType;
        }
        if (request.Status != null && Enum.TryParse<CycleTransactionStatus>(request.Status, out var status))
        {
            transaction.Status = status;
        }
        if (request.Notes != null) transaction.Notes = request.Notes;

        await _context.SaveChangesAsync();

        return MapToResponse(transaction);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var transaction = await _context.CycleTransactions.FindAsync(id);
        if (transaction == null) return false;

        _context.CycleTransactions.Remove(transaction);
        await _context.SaveChangesAsync();
        return true;
    }

    private static CycleTransactionResponse MapToResponse(CycleTransaction transaction) => new(
        transaction.SysId,
        transaction.CyclePlanSysId,
        transaction.Name,
        transaction.Amount,
        transaction.TransactionType.ToString(),
        transaction.Status.ToString(),
        transaction.Notes,
        transaction.CreateTimestamp,
        transaction.ModifyTimestamp
    );
}
