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
  debtLinkId?: string;
  debtType?: "repayment" | "recovery";
}

export interface DebtPlan {
  id: string;
  parentEntryId: string;
  direction: "received" | "given";
  totalAmount: number;
  splits: number;
  frequency: Frequency;
  startDate: string;
  linkedEntryIds: string[];
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

export interface Transfer {
  id: string;
  fromAccount: AccountType;
  toAccount: AccountType;
  amount: number;
  date: string;
  reason: string;
  isApplied: boolean; // false = suggestion, true = confirmed
  linkedItemId?: string; // which expense/sub triggered this suggestion
}

export interface TransferSuggestion {
  fromAccount: AccountType;
  toAccount: AccountType;
  amount: number;
  suggestedDate: string;
  reason: string;
  linkedItemLabel: string;
  feasibility: "feasible" | "risky" | "not_feasible";
}

export interface AccountShortfall {
  date: string;
  account: AccountType;
  itemLabel: string;
  requiredAmount: number;
  availableAmount: number;
  shortageAmount: number;
}

export interface CreditCardBillItem {
  date: string; // bill payment date
  amount: number; // total due
  label: string;
}

export type OtherAssetType = "RD" | "FD" | "Goal Savings" | "Emergency Fund" | "Other";
export type GoalType = "purchase" | "debt_payoff";
export type GoalStatus = "active" | "completed" | "paused";

export interface Goal {
  id: string;
  type: GoalType;
  name: string;
  targetAmount: number;
  contributionAmount: number;
  contributionFrequency: Frequency;
  startDate: string;
  targetDate: string;
  sourceAccount: AccountType;
  annualReturn: number;
  vehicle?: "RD" | "FD" | "Mutual Funds" | "Other Investment";
  debtType?: string;
  interestRate?: number;
  status: GoalStatus;
  linkedAssetId?: string; // only for purchase goals
}

export interface OtherAsset {
  id: string;
  name: string;
  type: OtherAssetType;
  currentValue: number;
  contributionAmount: number;
  contributionFrequency: Frequency;
  expectedReturn: number;
  targetAmount?: number;
  maturityDate?: string;
  startDate: string;
  status: "Active" | "Matured" | "Completed";
  linkedGoalId?: string;
}

export interface AppSettings {
  creditCardBillDay: number;
  transferSuggestionsEnabled: boolean;
  transferLeadDays: number;
  includeCreditCardInBalance: boolean;
  preferredNisabBasis?: "gold" | "silver";
  defaultGoldPrice?: string;
  defaultSilverPrice?: string;
  defaultCompoundingFrequency?: "monthly" | "halfyearly" | "annually";
  defaultGoalReturnRate?: number;
  showOtherAssetsInNav?: boolean;
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
  positionDate: string;
  subscriptions: Subscription[];
  entries: Entry[];
  investments: Investment[];
  debtPlans: DebtPlan[];
  transfers: Transfer[];
  goals: Goal[];
  otherAssets: OtherAsset[];
  settings: AppSettings;
  userProfile?: UserProfile;
}

export interface ForecastItem {
  date: string;
  label: string;
  amount: number;
  balance: number;
  type: "subscription" | "income" | "expense" | "cc_bill" | "transfer" | "goal_contribution" | "debt_payoff";
  account?: AccountType;
  isCheque?: boolean;
  isDebtLinked?: boolean;
  isOptional?: boolean;
}

export interface AccountForecastItem {
  date: string;
  label: string;
  amount: number;
  runningBalance: number;
  type: string;
}
