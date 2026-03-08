export type Frequency = "once" | "weekly" | "biweekly" | "monthly" | "quarterly" | "halfyearly" | "yearly";

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
  includeInForecast: boolean;
}

export interface Investment {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  startDate: string;
  endDate: string;
  category: string;
  expectedReturn: number;
  includeInForecast: boolean;
}

export interface AppData {
  currentBalance: number;
  accountBalances: AccountBalances;
  forecastDate: string;
  subscriptions: Subscription[];
  entries: Entry[];
  investments: Investment[];
}

export interface ForecastItem {
  date: string;
  label: string;
  amount: number;
  balance: number;
  type: "subscription" | "income" | "expense";
}
