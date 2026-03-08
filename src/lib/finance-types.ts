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

export interface AppData {
  currentBalance: number;
  forecastDate: string;
  subscriptions: Subscription[];
  entries: Entry[];
}

export interface ForecastItem {
  date: string;
  label: string;
  amount: number;
  balance: number;
  type: "subscription" | "income" | "expense";
}
