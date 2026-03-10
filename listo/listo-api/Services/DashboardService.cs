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
            var transactions = activePlan.CycleTransactions ?? new List<CycleTransaction>();
            var totalCredits = transactions
                .Where(t => t.TransactionType == CycleTransactionType.Credit)
                .Sum(t => t.Amount);
            var totalDebits = transactions
                .Where(t => t.TransactionType == CycleTransactionType.Debit)
                .Sum(t => t.Amount);

            var transactionsTotal = totalCredits - totalDebits;
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
                daysRemaining > 0 ? daysRemaining : 0,
                totalCredits,
                totalDebits
            );
        }

        // Aviation: Training summary
        AviationSummaryDto? aviationStats = null;

        // Get all training logs for the chart
        var allTrainingLogs = await _context.TrainingLogs
            .Include(t => t.TrainingType)
            .ToListAsync();

        if (allTrainingLogs.Count > 0)
        {
            // Stats are only for Dual Flight Training and Solo Flight Training
            var flightLogs = allTrainingLogs
                .Where(t => t.TrainingType.Name == "Dual Flight Training" || t.TrainingType.Name == "Solo Flight Training")
                .ToList();

            var totalDualHours = flightLogs
                .Where(t => t.TrainingType.Name == "Dual Flight Training")
                .Sum(t => t.HoursFlown);

            var totalSoloHours = flightLogs
                .Where(t => t.TrainingType.Name == "Solo Flight Training")
                .Sum(t => t.HoursFlown);

            var lastTrainingDate = flightLogs
                .OrderByDescending(t => t.Date)
                .Select(t => (DateTime?)t.Date)
                .FirstOrDefault();

            // Calculate hours by training type for last 30 days
            var recentLogs = allTrainingLogs.Where(t => t.Date >= last30Days).ToList();
            var hoursByType = recentLogs
                .GroupBy(t => t.TrainingType.Name)
                .Select(g => new TrainingTypeHoursDto(g.Key, g.Sum(t => t.HoursFlown)))
                .OrderBy(h => h.TrainingType)
                .ToList();

            aviationStats = new AviationSummaryDto(
                totalDualHours,
                totalSoloHours,
                lastTrainingDate,
                hoursByType
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
