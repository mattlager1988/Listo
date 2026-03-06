using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IPaymentService
{
    Task<IEnumerable<PaymentResponse>> GetPendingPaymentsAsync();
    Task<IEnumerable<PaymentResponse>> GetPaymentsByAccountAsync(long accountSysId);
    Task<IEnumerable<PaymentSummaryResponse>> GetPaymentSummaryAsync(long accountSysId, int months = 12);
    Task<PaymentResponse?> GetByIdAsync(long id);
    Task<PaymentResponse> CreateAsync(CreatePaymentRequest request);
    Task<PaymentResponse?> UpdateAsync(long id, UpdatePaymentRequest request);
    Task<PaymentResponse?> CompleteAsync(long id);
    Task<bool> DeleteAsync(long id);
}

public class PaymentService : IPaymentService
{
    private readonly ListoDbContext _context;

    public PaymentService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PaymentResponse>> GetPendingPaymentsAsync()
    {
        var payments = await _context.Payments
            .Include(p => p.Account)
            .Include(p => p.PaymentMethod)
            .Where(p => p.Status == PaymentStatus.Pending)
            .OrderBy(p => p.CreateTimestamp)
            .ToListAsync();

        return payments.Select(MapToResponse);
    }

    public async Task<IEnumerable<PaymentResponse>> GetPaymentsByAccountAsync(long accountSysId)
    {
        var payments = await _context.Payments
            .Include(p => p.Account)
            .Include(p => p.PaymentMethod)
            .Where(p => p.AccountSysId == accountSysId)
            .OrderByDescending(p => p.CreateTimestamp)
            .ToListAsync();

        return payments.Select(MapToResponse);
    }

    public async Task<IEnumerable<PaymentSummaryResponse>> GetPaymentSummaryAsync(long accountSysId, int months = 12)
    {
        var startDate = DateTime.UtcNow.AddMonths(-months + 1);
        startDate = new DateTime(startDate.Year, startDate.Month, 1);

        // Fetch payments first, then group client-side (EF Core can't translate GroupBy with Sum to SQL)
        var payments = await _context.Payments
            .Where(p => p.AccountSysId == accountSysId && p.CreateTimestamp >= startDate)
            .Select(p => new { p.CreateTimestamp.Year, p.CreateTimestamp.Month, p.Amount })
            .ToListAsync();

        var summary = payments
            .GroupBy(p => new { p.Year, p.Month })
            .Select(g => new PaymentSummaryResponse(
                g.Key.Year,
                g.Key.Month,
                g.Sum(p => p.Amount)
            ))
            .OrderBy(s => s.Year)
            .ThenBy(s => s.Month)
            .ToList();

        return summary;
    }

    public async Task<PaymentResponse?> GetByIdAsync(long id)
    {
        var payment = await _context.Payments
            .Include(p => p.Account)
            .Include(p => p.PaymentMethod)
            .FirstOrDefaultAsync(p => p.SysId == id);

        return payment == null ? null : MapToResponse(payment);
    }

    public async Task<PaymentResponse> CreateAsync(CreatePaymentRequest request)
    {
        var account = await _context.Accounts.FindAsync(request.AccountSysId);
        if (account == null)
            throw new ArgumentException("Account not found");

        var payment = new Payment
        {
            AccountSysId = request.AccountSysId,
            PaymentMethodSysId = request.PaymentMethodSysId,
            Amount = request.Amount,
            Description = request.Description,
            ConfirmationNumber = request.ConfirmationNumber,
            Status = PaymentStatus.Pending
        };

        _context.Payments.Add(payment);

        // Reset AmountDue to 0 if account has ResetAmountDue flag set
        if (account.ResetAmountDue)
        {
            account.AmountDue = 0;
        }

        await _context.SaveChangesAsync();

        await _context.Entry(payment).Reference(p => p.Account).LoadAsync();
        await _context.Entry(payment).Reference(p => p.PaymentMethod).LoadAsync();

        return MapToResponse(payment);
    }

    public async Task<PaymentResponse?> UpdateAsync(long id, UpdatePaymentRequest request)
    {
        var payment = await _context.Payments
            .Include(p => p.Account)
            .Include(p => p.PaymentMethod)
            .FirstOrDefaultAsync(p => p.SysId == id);

        if (payment == null) return null;

        // Only allow editing pending payments
        if (payment.Status != PaymentStatus.Pending)
            throw new InvalidOperationException("Cannot edit a completed payment");

        if (request.PaymentMethodSysId.HasValue)
            payment.PaymentMethodSysId = request.PaymentMethodSysId.Value;
        if (request.Amount.HasValue)
            payment.Amount = request.Amount.Value;
        if (request.Description != null)
            payment.Description = request.Description;
        if (request.ConfirmationNumber != null)
            payment.ConfirmationNumber = request.ConfirmationNumber;

        await _context.SaveChangesAsync();

        await _context.Entry(payment).Reference(p => p.PaymentMethod).LoadAsync();

        return MapToResponse(payment);
    }

    public async Task<PaymentResponse?> CompleteAsync(long id)
    {
        var payment = await _context.Payments
            .Include(p => p.Account)
            .Include(p => p.PaymentMethod)
            .FirstOrDefaultAsync(p => p.SysId == id);

        if (payment == null) return null;

        payment.Status = PaymentStatus.Complete;
        payment.CompletedDate = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToResponse(payment);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var payment = await _context.Payments.FindAsync(id);
        if (payment == null) return false;

        // Only allow deleting pending payments
        if (payment.Status != PaymentStatus.Pending)
            throw new InvalidOperationException("Cannot delete a completed payment");

        _context.Payments.Remove(payment);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PaymentResponse MapToResponse(Payment payment) => new(
        payment.SysId,
        payment.AccountSysId,
        payment.Account.Name,
        payment.PaymentMethodSysId,
        payment.PaymentMethod.Name,
        payment.Amount,
        payment.Description,
        payment.ConfirmationNumber,
        payment.Status.ToString(),
        payment.CompletedDate,
        payment.CreateTimestamp
    );
}
