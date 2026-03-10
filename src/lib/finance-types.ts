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
  vehicleName?: string; // for "Other Investment" type
  debtType?: string;
  interestRate?: number;
  status: GoalStatus;
  linkedAssetId?: string; // only for purchase goals
  linkedEntryIds?: string[]; // recurring contribution entry IDs
}

export interface LiabilityPayoff {
  id: string;
  name: string;
  originalAmount: number;
  payoffAmount: number;
  payoffFrequency: Frequency;
  startDate: string;
  targetDate: string;
  sourceAccount: AccountType;
  status: GoalStatus;
  linkedEntryIds?: string[];
}

export interface OtherAsset {
  id: string;
  name: string;
  type: OtherAssetType;
  typeName?: string; // for "Other" type
  currentValue: number;
  contributionAmount: number;
  contributionFrequency: Frequency;
  expectedReturn: number;
  targetAmount?: number;
  maturityDate?: string;
  startDate: string;
  status: "Active" | "Matured" | "Completed";
  linkedGoalId?: string;
  sourceAccount?: AccountType;
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
  customIncomeCategories?: string[];
  customExpenseCategories?: string[];
}

export interface UserProfile {
  name: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  finnyUserId?: string;
  gender?: string;
  maritalStatus?: string;
  phoneCode?: string;
  phoneNumber?: string;
  country: string;
  currency: string;
  currencySymbol: string;
  enabledAccounts: AccountType[];
}

export type FamilyRelationship = "spouse" | "child" | "parent" | "sibling";
export type FamilyRequestStatus = "pending" | "approved" | "rejected";
export type FamilyRequestType = "purchase" | "contribution" | "allowance" | "other";

export interface FamilyMember {
  id: string;
  name: string;
  relationship: FamilyRelationship;
  emoji: string;
  linkedUserId?: string;
  linkedFinnyId?: string;
  addedDate: string;
}

export interface FamilyRequest {
  id: string;
  fromMemberId: string;
  toMemberId?: string;
  type: FamilyRequestType;
  description: string;
  amount: number;
  status: FamilyRequestStatus;
  date: string;
  category?: string;
  account?: AccountType;
}

export interface PiggyBank {
  id: string;
  childMemberId: string;
  childName: string;
  targetAmount: number;
  currentAmount: number;
  emoji: string;
  contributions: PiggyBankContribution[];
}

export interface PiggyBankContribution {
  id: string;
  amount: number;
  date: string;
  fromMemberName: string;
  note?: string;
}

export interface SharedGoal {
  id: string;
  name: string;
  targetAmount: number;
  emoji: string;
  contributions: SharedGoalContribution[];
  createdDate: string;
  targetDate?: string;
}

export interface SharedGoalContribution {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
}

export interface FamilyData {
  members: FamilyMember[];
  requests: FamilyRequest[];
  piggyBanks: PiggyBank[];
  sharedGoals: SharedGoal[];
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
  liabilityPayoffs: LiabilityPayoff[];
  settings: AppSettings;
  userProfile?: UserProfile;
  familyData?: FamilyData;
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
