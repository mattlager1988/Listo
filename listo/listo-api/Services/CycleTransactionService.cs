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
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.CreateTimestamp)
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
        var transaction = new CycleTransaction
        {
            CyclePlanSysId = request.CyclePlanSysId,
            AmountIn = request.AmountIn,
            AmountOut = request.AmountOut,
            Description = request.Description,
            TransactionDate = request.TransactionDate
        };

        _context.CycleTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        return MapToResponse(transaction);
    }

    public async Task<CycleTransactionResponse?> UpdateAsync(long id, UpdateCycleTransactionRequest request)
    {
        var transaction = await _context.CycleTransactions.FindAsync(id);
        if (transaction == null) return null;

        if (request.AmountIn.HasValue) transaction.AmountIn = request.AmountIn.Value;
        if (request.AmountOut.HasValue) transaction.AmountOut = request.AmountOut.Value;
        if (request.Description != null) transaction.Description = request.Description;
        if (request.TransactionDate.HasValue) transaction.TransactionDate = request.TransactionDate.Value;

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
        transaction.AmountIn,
        transaction.AmountOut,
        transaction.Description,
        transaction.TransactionDate,
        transaction.CreateTimestamp
    );
}
