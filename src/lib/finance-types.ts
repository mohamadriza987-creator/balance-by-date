export type Frequency = "once" | "daily" | "weekly" | "biweekly" | "monthly" | "quarterly" | "halfyearly" | "yearly";
export type AccountType = "cash" | "bank" | "creditCard";

export interface AccountBalances {
  cash: number;
  bank: number;
  creditCard: number;
}

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  nextDate: string; // YYYY-MM-DD
  category: string;
  account: AccountType;
  includeInForecast: boolean;
  isTrial?: boolean;
  trialEndDate?: string;
}

export interface Entry {
  id: string;
  label: string;
  amount: number; // positive = income, negative = expense
  date: string; // YYYY-MM-DD
  frequency: Frequency;
  category: string;
  account: AccountType;
  includeInForecast: boolean;
  isCheque?: boolean;
  isOptional?: boolean;
  debtLinkId?: string; // links to parent debt entry id
  debtType?: "repayment" | "recovery"; // what kind of linked debt item this is
}

export interface DebtPlan {
  id: string;
  parentEntryId: string; // the inflow or outflow entry that created this debt
  direction: "received" | "given"; // received = inflow debt, given = outflow debt
  totalAmount: number;
  splits: number;
  frequency: Frequency;
  startDate: string;
  linkedEntryIds: string[]; // generated repayment/recovery entry ids
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  category: string;
  account: AccountType;
  expectedReturn: number;
  includeInForecast: boolean;
}

export interface UserProfile {
  name: string;
  country: string;
  currency: string;
  currencySymbol: string;
  enabledAccounts: AccountType[];
}

export interface AppData {
  currentBalance: number;
  accountBalances: AccountBalances;
  forecastDate: string;
  positionDate: string; // "today" reference date for all calculations
  subscriptions: Subscription[];
  entries: Entry[];
  investments: Investment[];
  debtPlans: DebtPlan[];
  userProfile?: UserProfile;
}

export interface ForecastItem {
  date: string;
  label: string;
  amount: number;
  balance: number;
  type: "subscription" | "income" | "expense";
  isCheque?: boolean;
  isDebtLinked?: boolean;
  isOptional?: boolean;
}
