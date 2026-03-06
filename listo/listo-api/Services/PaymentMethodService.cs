using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IPaymentMethodService
{
    Task<IEnumerable<PaymentMethodResponse>> GetAllAsync(bool includeDeleted = false);
    Task<PaymentMethodResponse?> GetByIdAsync(long id);
    Task<PaymentMethodResponse> CreateAsync(CreatePaymentMethodRequest request);
    Task<PaymentMethodResponse?> UpdateAsync(long id, UpdatePaymentMethodRequest request);
    Task<bool> DeleteAsync(long id);
    Task<bool> RestoreAsync(long id);
    Task<bool> PurgeAsync(long id);
}

public class PaymentMethodService : IPaymentMethodService
{
    private readonly ListoDbContext _context;

    public PaymentMethodService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<PaymentMethodResponse>> GetAllAsync(bool includeDeleted = false)
    {
        var query = _context.PaymentMethods
            .Include(p => p.Payments)
            .AsQueryable();

        if (!includeDeleted)
        {
            query = query.Where(p => !p.IsDeleted);
        }

        var items = await query.OrderBy(p => p.Name).ToListAsync();
        return items.Select(MapToResponse);
    }

    public async Task<PaymentMethodResponse?> GetByIdAsync(long id)
    {
        var item = await _context.PaymentMethods
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.SysId == id);
        return item == null ? null : MapToResponse(item);
    }

    public async Task<PaymentMethodResponse> CreateAsync(CreatePaymentMethodRequest request)
    {
        var item = new PaymentMethod { Name = request.Name };
        _context.PaymentMethods.Add(item);
        await _context.SaveChangesAsync();
        return MapToResponse(item);
    }

    public async Task<PaymentMethodResponse?> UpdateAsync(long id, UpdatePaymentMethodRequest request)
    {
        var item = await _context.PaymentMethods.FindAsync(id);
        if (item == null) return null;

        if (request.Name != null) item.Name = request.Name;
        await _context.SaveChangesAsync();

        return MapToResponse(item);
    }

    public async Task<bool> DeleteAsync(long id)
    {
        var item = await _context.PaymentMethods.FindAsync(id);
        if (item == null) return false;

        item.IsDeleted = true;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RestoreAsync(long id)
    {
        var item = await _context.PaymentMethods.FindAsync(id);
        if (item == null) return false;

        item.IsDeleted = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> PurgeAsync(long id)
    {
        var item = await _context.PaymentMethods
            .Include(p => p.Payments)
            .FirstOrDefaultAsync(p => p.SysId == id);
        if (item == null) return false;
        if (item.Payments.Any()) return false;

        _context.PaymentMethods.Remove(item);
        await _context.SaveChangesAsync();
        return true;
    }

    private static PaymentMethodResponse MapToResponse(PaymentMethod item) => new(
        item.SysId,
        item.Name,
        item.IsDeleted,
        item.Payments?.Count ?? 0
    );
}
