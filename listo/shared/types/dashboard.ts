export interface BankAccountSummary {
  sysId: number;
  name: string;
  accountType: string;
  balance: number;
  color: string | null;
}

export interface CyclePlanSummary {
  sysId: number;
  startDate: string;
  endDate: string;
  cycleGoalName: string;
  amountIn: number;
  amountOut: number;
  balance: number;
  daysRemaining: number;
  totalCredits: number;
  totalDebits: number;
}

export interface UpcomingBill {
  sysId: number;
  accountName: string;
  amountDue: number;
  dueDate: string;
  autoPay: boolean;
  accountFlag: string;
}

export interface PendingPayment {
  sysId: number;
  accountSysId: number;
  amount: number;
  description: string | null;
  dueDate: string | null;
  accountName: string;
}

export interface DashboardSummary {
  bankAccounts: BankAccountSummary[];
  activeCyclePlan: CyclePlanSummary | null;
  upcomingBills: UpcomingBill[];
  aviationStats: unknown;
}
