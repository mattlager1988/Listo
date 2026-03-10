export interface Account {
  sysId: number;
  name: string;
  accountTypeSysId: number;
  accountTypeName: string;
  accountOwnerSysId: number;
  accountOwnerName: string;
  amountDue: number;
  dueDate: string | null;
  accountNumber: string | null;
  phoneNumber: string | null;
  webAddress: string | null;
  username: string | null;
  password: string | null;
  autoPay: boolean;
  resetAmountDue: boolean;
  accountFlag: string;
  notes: string | null;
  isDiscontinued: boolean;
  discontinuedDate: string | null;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  defaultPaymentMethodSysId: number | null;
  defaultBankAccountSysId: number | null;
}

export interface Payment {
  sysId: number;
  accountSysId: number;
  accountName: string;
  paymentMethodSysId: number;
  paymentMethodName: string;
  amount: number;
  description: string | null;
  confirmationNumber: string | null;
  status: string;
  completedDate: string | null;
  createTimestamp: string;
  bankAccountSysId: number | null;
  bankAccountName: string | null;
  dueDate: string | null;
}

export interface PaymentMethod {
  sysId: number;
  name: string;
  isDeleted: boolean;
}

export interface BankAccount {
  sysId: number;
  name: string;
  accountType: string;
  accountNumber: string | null;
  routingNumber: string | null;
  balance: number;
  color: string | null;
  isDiscontinued: boolean;
  discontinuedDate: string | null;
}

export interface CyclePlan {
  sysId: number;
  startDate: string;
  endDate: string;
  cycleGoalSysId: number;
  cycleGoalName: string;
  status: string;
  amountIn: number;
  amountOut: number;
  balance: number;
  notes: string | null;
  isDiscontinued: boolean;
  discontinuedDate: string | null;
}

export interface CycleGoal {
  sysId: number;
  name: string;
  isDeleted: boolean;
}

export interface CycleTransaction {
  sysId: number;
  cyclePlanSysId: number;
  name: string;
  amount: number;
  transactionType: string;
  status: string;
  notes: string | null;
  createTimestamp: string;
  modifyTimestamp: string;
}

export interface ListItem {
  sysId: number;
  name: string;
  isDeleted: boolean;
}
