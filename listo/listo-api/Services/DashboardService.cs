using Microsoft.EntityFrameworkCore;
using Listo.Api.Data;
using Listo.Api.DTOs;
using Listo.Api.Models;

namespace Listo.Api.Services;

public interface IDashboardService
{
    Task<DashboardSummaryResponse> GetSummaryAsync();
}

public class DashboardService : IDashboardService
{
    private readonly ListoDbContext _context;

    public DashboardService(ListoDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryResponse> GetSummaryAsync()
    {
        var now = DateTime.UtcNow;
        var in14Days = now.AddDays(14);
        var last30Days = now.AddDays(-30);

        // Finance: Accounts for upcoming bills
        var activeAccounts = await _context.Accounts
            .Where(a => !a.IsDiscontinued)
            .ToListAsync();

        // Finance: Bank accounts
        var bankAccounts = await _context.BankAccounts
            .Where(b => !b.IsDiscontinued)
            .OrderBy(b => b.Name)
            .Select(b => new BankAccountSummaryDto(
                b.SysId,
                b.Name,
                b.AccountType.ToString(),
                b.Balance,
                b.Color
            ))
            .ToListAsync();

        // Finance: Upcoming bills (accounts with DueDate in next 14 days)
        var upcomingBills = activeAccounts
            .Where(a => a.DueDate.HasValue && a.DueDate.Value >= now.Date && a.DueDate.Value <= in14Days.Date)
            .OrderBy(a => a.DueDate)
            .Take(10)
            .Select(a => new UpcomingBillDto(
                a.SysId,
                a.Name,
                a.AmountDue,
                a.DueDate!.Value,
                a.AutoPay,
                a.AccountFlag.ToString()
            ))
            .ToList();

        // Finance: Active cycle plan
        CyclePlanSummaryDto? activeCyclePlan = null;
        var activePlan = await _context.CyclePlans
            .Include(p => p.CycleGoal)
            .Include(p => p.CycleTransactions)
            .Where(p => !p.IsDiscontinued && p.Status == CyclePlanStatus.Active)
            .OrderByDescending(p => p.StartDate)
            .FirstOrDefaultAsync();

        if (activePlan != null)
        {
            var transactionsTotal = activePlan.CycleTransactions?.Sum(t =>
                t.TransactionType == CycleTransactionType.Credit ? t.Amount : -t.Amount) ?? 0;
            var balance = activePlan.AmountIn + transactionsTotal - activePlan.AmountOut;
            var daysRemaining = (activePlan.EndDate.Date - now.Date).Days;

            activeCyclePlan = new CyclePlanSummaryDto(
                activePlan.SysId,
                activePlan.StartDate,
                activePlan.EndDate,
                activePlan.CycleGoal.Name,
                activePlan.AmountIn,
                activePlan.AmountOut,
                balance,
                daysRemaining > 0 ? daysRemaining : 0
            );
        }

        // Aviation: Training summary (only Dual Flight Training and Solo Flight Training)
        AviationSummaryDto? aviationStats = null;
        var flightTrainingTypes = new[] { "Dual Flight Training", "Solo Flight Training" };

        var flightLogs = await _context.TrainingLogs
            .Include(t => t.TrainingType)
            .Where(t => flightTrainingTypes.Contains(t.TrainingType.Name))
            .ToListAsync();

        if (flightLogs.Count > 0)
        {
            var totalHoursAllTime = flightLogs.Sum(t => t.HoursFlown);

            var recentLogs = flightLogs.Where(t => t.Date >= last30Days).ToList();
            var hoursLast30Days = recentLogs.Sum(t => t.HoursFlown);
            var entriesLast30Days = recentLogs.Count;

            var lastTrainingDate = flightLogs
                .OrderByDescending(t => t.Date)
                .Select(t => (DateTime?)t.Date)
                .FirstOrDefault();

            aviationStats = new AviationSummaryDto(
                totalHoursAllTime,
                hoursLast30Days,
                entriesLast30Days,
                lastTrainingDate
            );
        }

        return new DashboardSummaryResponse(
            bankAccounts,
            activeCyclePlan,
            upcomingBills,
            aviationStats
        );
    }
}
