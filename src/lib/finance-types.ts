export type Frequency = "once" | "weekly" | "biweekly" | "monthly" | "quarterly" | "halfyearly" | "yearly";

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
  amount: number; // periodic investment amount
  frequency: Frequency;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (maturity)
  category: string;
  expectedReturn: number; // annual rate of return (0-40)
  includeInForecast: boolean;
}

export interface AppData {
  currentBalance: number;
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
