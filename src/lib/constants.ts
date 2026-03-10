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
  "Interest", "Rental", "Gift", "Debt", "Other",
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
  creditCard: "Credit Card Due",
};

export const ACCOUNT_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "creditCard", label: "Credit Card Due" },
];

export const TYPE_COLORS: Record<string, string> = {
  income: "bg-success/10 text-success border-success/20",
  expense: "bg-destructive/10 text-destructive border-destructive/20",
  subscription: "bg-warning/10 text-warning border-warning/20",
  investment: "bg-info/10 text-info border-info/20",
  emi: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  debt: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  cheque: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cc_bill: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  transfer: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  goal_contribution: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  debt_payoff: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export const COUNTRIES_CURRENCIES: { country: string; currency: string; symbol: string; phoneCode: string }[] = [
  { country: "Afghanistan", currency: "AFN", symbol: "؋", phoneCode: "+93" },
  { country: "Albania", currency: "ALL", symbol: "L" },
  { country: "Algeria", currency: "DZD", symbol: "د.ج" },
  { country: "Argentina", currency: "ARS", symbol: "$" },
  { country: "Australia", currency: "AUD", symbol: "A$" },
  { country: "Austria", currency: "EUR", symbol: "€" },
  { country: "Bahrain", currency: "BHD", symbol: "BD" },
  { country: "Bangladesh", currency: "BDT", symbol: "৳" },
  { country: "Belgium", currency: "EUR", symbol: "€" },
  { country: "Brazil", currency: "BRL", symbol: "R$" },
  { country: "Canada", currency: "CAD", symbol: "C$" },
  { country: "Chile", currency: "CLP", symbol: "$" },
  { country: "China", currency: "CNY", symbol: "¥" },
  { country: "Colombia", currency: "COP", symbol: "$" },
  { country: "Czech Republic", currency: "CZK", symbol: "Kč" },
  { country: "Denmark", currency: "DKK", symbol: "kr" },
  { country: "Egypt", currency: "EGP", symbol: "E£" },
  { country: "Finland", currency: "EUR", symbol: "€" },
  { country: "France", currency: "EUR", symbol: "€" },
  { country: "Germany", currency: "EUR", symbol: "€" },
  { country: "Ghana", currency: "GHS", symbol: "GH₵" },
  { country: "Greece", currency: "EUR", symbol: "€" },
  { country: "Hong Kong", currency: "HKD", symbol: "HK$" },
  { country: "Hungary", currency: "HUF", symbol: "Ft" },
  { country: "India", currency: "INR", symbol: "₹" },
  { country: "Indonesia", currency: "IDR", symbol: "Rp" },
  { country: "Iran", currency: "IRR", symbol: "﷼" },
  { country: "Iraq", currency: "IQD", symbol: "ع.د" },
  { country: "Ireland", currency: "EUR", symbol: "€" },
  { country: "Israel", currency: "ILS", symbol: "₪" },
  { country: "Italy", currency: "EUR", symbol: "€" },
  { country: "Japan", currency: "JPY", symbol: "¥" },
  { country: "Jordan", currency: "JOD", symbol: "JD" },
  { country: "Kenya", currency: "KES", symbol: "KSh" },
  { country: "Kuwait", currency: "KWD", symbol: "KD" },
  { country: "Lebanon", currency: "LBP", symbol: "ل.ل" },
  { country: "Malaysia", currency: "MYR", symbol: "RM" },
  { country: "Maldives", currency: "MVR", symbol: "Rf" },
  { country: "Mexico", currency: "MXN", symbol: "$" },
  { country: "Morocco", currency: "MAD", symbol: "MAD" },
  { country: "Nepal", currency: "NPR", symbol: "Rs" },
  { country: "Netherlands", currency: "EUR", symbol: "€" },
  { country: "New Zealand", currency: "NZD", symbol: "NZ$" },
  { country: "Nigeria", currency: "NGN", symbol: "₦" },
  { country: "Norway", currency: "NOK", symbol: "kr" },
  { country: "Oman", currency: "OMR", symbol: "OMR" },
  { country: "Pakistan", currency: "PKR", symbol: "₨" },
  { country: "Palestine", currency: "ILS", symbol: "₪" },
  { country: "Peru", currency: "PEN", symbol: "S/" },
  { country: "Philippines", currency: "PHP", symbol: "₱" },
  { country: "Poland", currency: "PLN", symbol: "zł" },
  { country: "Portugal", currency: "EUR", symbol: "€" },
  { country: "Qatar", currency: "QAR", symbol: "QR" },
  { country: "Romania", currency: "RON", symbol: "lei" },
  { country: "Russia", currency: "RUB", symbol: "₽" },
  { country: "Saudi Arabia", currency: "SAR", symbol: "SR" },
  { country: "Singapore", currency: "SGD", symbol: "S$" },
  { country: "South Africa", currency: "ZAR", symbol: "R" },
  { country: "South Korea", currency: "KRW", symbol: "₩" },
  { country: "Spain", currency: "EUR", symbol: "€" },
  { country: "Sri Lanka", currency: "LKR", symbol: "Rs" },
  { country: "Sweden", currency: "SEK", symbol: "kr" },
  { country: "Switzerland", currency: "CHF", symbol: "CHF" },
  { country: "Taiwan", currency: "TWD", symbol: "NT$" },
  { country: "Thailand", currency: "THB", symbol: "฿" },
  { country: "Tunisia", currency: "TND", symbol: "DT" },
  { country: "Turkey", currency: "TRY", symbol: "₺" },
  { country: "UAE", currency: "AED", symbol: "AED" },
  { country: "UK", currency: "GBP", symbol: "£" },
  { country: "USA", currency: "USD", symbol: "$" },
  { country: "Ukraine", currency: "UAH", symbol: "₴" },
  { country: "Vietnam", currency: "VND", symbol: "₫" },
  { country: "Yemen", currency: "YER", symbol: "YR" },
];
