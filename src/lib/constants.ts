import type { Frequency, AccountType } from "./finance-types";

export const APP_NAME = "Finance Buddy";
export const APP_SUBTITLE = "Know your balance before the date arrives";
export const APP_TAGLINE = "See how much money you'll have on any future date";

export const EXPENSE_CATEGORIES = [
  "Housing", "Food", "Utilities", "Transport", "Health",
  "Entertainment", "Shopping", "Debt", "Investment", "Subscription",
  "Insurance", "Education", "Travel", "Other",
] as const;

export const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Bonus", "Refund",
  "Interest", "Rental", "Gift", "Other",
] as const;

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "once", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "halfyearly", label: "Half-yearly" },
  { value: "yearly", label: "Yearly" },
];

export const ACCOUNT_LABELS: Record<AccountType, string> = {
  cash: "Cash",
  bank: "Bank",
  creditCard: "Card Outstanding",
};

export const ACCOUNT_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "creditCard", label: "Card Outstanding" },
];

export const TYPE_COLORS = {
  income: "bg-success/10 text-success border-success/20",
  expense: "bg-destructive/10 text-destructive border-destructive/20",
  subscription: "bg-warning/10 text-warning border-warning/20",
  investment: "bg-info/10 text-info border-info/20",
  emi: "bg-purple-500/10 text-purple-400 border-purple-500/20",
} as const;
