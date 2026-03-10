import type { Frequency, AccountType } from "./finance-types";

export const APP_NAME = "FinnyLand-View";
export const APP_SUBTITLE = "Where Goals Grow Together";
export const APP_TAGLINE = "Manage your finances, reach your goals, grow together";

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
  { country: "Albania", currency: "ALL", symbol: "L", phoneCode: "+355" },
  { country: "Algeria", currency: "DZD", symbol: "د.ج", phoneCode: "+213" },
  { country: "Argentina", currency: "ARS", symbol: "$", phoneCode: "+54" },
  { country: "Australia", currency: "AUD", symbol: "A$", phoneCode: "+61" },
  { country: "Austria", currency: "EUR", symbol: "€", phoneCode: "+43" },
  { country: "Bahrain", currency: "BHD", symbol: "BD", phoneCode: "+973" },
  { country: "Bangladesh", currency: "BDT", symbol: "৳", phoneCode: "+880" },
  { country: "Belgium", currency: "EUR", symbol: "€", phoneCode: "+32" },
  { country: "Brazil", currency: "BRL", symbol: "R$", phoneCode: "+55" },
  { country: "Canada", currency: "CAD", symbol: "C$", phoneCode: "+1" },
  { country: "Chile", currency: "CLP", symbol: "$", phoneCode: "+56" },
  { country: "China", currency: "CNY", symbol: "¥", phoneCode: "+86" },
  { country: "Colombia", currency: "COP", symbol: "$", phoneCode: "+57" },
  { country: "Czech Republic", currency: "CZK", symbol: "Kč", phoneCode: "+420" },
  { country: "Denmark", currency: "DKK", symbol: "kr", phoneCode: "+45" },
  { country: "Egypt", currency: "EGP", symbol: "E£", phoneCode: "+20" },
  { country: "Finland", currency: "EUR", symbol: "€", phoneCode: "+358" },
  { country: "France", currency: "EUR", symbol: "€", phoneCode: "+33" },
  { country: "Germany", currency: "EUR", symbol: "€", phoneCode: "+49" },
  { country: "Ghana", currency: "GHS", symbol: "GH₵", phoneCode: "+233" },
  { country: "Greece", currency: "EUR", symbol: "€", phoneCode: "+30" },
  { country: "Hong Kong", currency: "HKD", symbol: "HK$", phoneCode: "+852" },
  { country: "Hungary", currency: "HUF", symbol: "Ft", phoneCode: "+36" },
  { country: "India", currency: "INR", symbol: "₹", phoneCode: "+91" },
  { country: "Indonesia", currency: "IDR", symbol: "Rp", phoneCode: "+62" },
  { country: "Iran", currency: "IRR", symbol: "﷼", phoneCode: "+98" },
  { country: "Iraq", currency: "IQD", symbol: "ع.د", phoneCode: "+964" },
  { country: "Ireland", currency: "EUR", symbol: "€", phoneCode: "+353" },
  { country: "Israel", currency: "ILS", symbol: "₪", phoneCode: "+972" },
  { country: "Italy", currency: "EUR", symbol: "€", phoneCode: "+39" },
  { country: "Japan", currency: "JPY", symbol: "¥", phoneCode: "+81" },
  { country: "Jordan", currency: "JOD", symbol: "JD", phoneCode: "+962" },
  { country: "Kenya", currency: "KES", symbol: "KSh", phoneCode: "+254" },
  { country: "Kuwait", currency: "KWD", symbol: "KD", phoneCode: "+965" },
  { country: "Lebanon", currency: "LBP", symbol: "ل.ل", phoneCode: "+961" },
  { country: "Malaysia", currency: "MYR", symbol: "RM", phoneCode: "+60" },
  { country: "Maldives", currency: "MVR", symbol: "Rf", phoneCode: "+960" },
  { country: "Mexico", currency: "MXN", symbol: "$", phoneCode: "+52" },
  { country: "Morocco", currency: "MAD", symbol: "MAD", phoneCode: "+212" },
  { country: "Nepal", currency: "NPR", symbol: "Rs", phoneCode: "+977" },
  { country: "Netherlands", currency: "EUR", symbol: "€", phoneCode: "+31" },
  { country: "New Zealand", currency: "NZD", symbol: "NZ$", phoneCode: "+64" },
  { country: "Nigeria", currency: "NGN", symbol: "₦", phoneCode: "+234" },
  { country: "Norway", currency: "NOK", symbol: "kr", phoneCode: "+47" },
  { country: "Oman", currency: "OMR", symbol: "OMR", phoneCode: "+968" },
  { country: "Pakistan", currency: "PKR", symbol: "₨", phoneCode: "+92" },
  { country: "Palestine", currency: "ILS", symbol: "₪", phoneCode: "+970" },
  { country: "Peru", currency: "PEN", symbol: "S/", phoneCode: "+51" },
  { country: "Philippines", currency: "PHP", symbol: "₱", phoneCode: "+63" },
  { country: "Poland", currency: "PLN", symbol: "zł", phoneCode: "+48" },
  { country: "Portugal", currency: "EUR", symbol: "€", phoneCode: "+351" },
  { country: "Qatar", currency: "QAR", symbol: "QR", phoneCode: "+974" },
  { country: "Romania", currency: "RON", symbol: "lei", phoneCode: "+40" },
  { country: "Russia", currency: "RUB", symbol: "₽", phoneCode: "+7" },
  { country: "Saudi Arabia", currency: "SAR", symbol: "SR", phoneCode: "+966" },
  { country: "Singapore", currency: "SGD", symbol: "S$", phoneCode: "+65" },
  { country: "South Africa", currency: "ZAR", symbol: "R", phoneCode: "+27" },
  { country: "South Korea", currency: "KRW", symbol: "₩", phoneCode: "+82" },
  { country: "Spain", currency: "EUR", symbol: "€", phoneCode: "+34" },
  { country: "Sri Lanka", currency: "LKR", symbol: "Rs", phoneCode: "+94" },
  { country: "Sweden", currency: "SEK", symbol: "kr", phoneCode: "+46" },
  { country: "Switzerland", currency: "CHF", symbol: "CHF", phoneCode: "+41" },
  { country: "Taiwan", currency: "TWD", symbol: "NT$", phoneCode: "+886" },
  { country: "Thailand", currency: "THB", symbol: "฿", phoneCode: "+66" },
  { country: "Tunisia", currency: "TND", symbol: "DT", phoneCode: "+216" },
  { country: "Turkey", currency: "TRY", symbol: "₺", phoneCode: "+90" },
  { country: "UAE", currency: "AED", symbol: "AED", phoneCode: "+971" },
  { country: "UK", currency: "GBP", symbol: "£", phoneCode: "+44" },
  { country: "USA", currency: "USD", symbol: "$", phoneCode: "+1" },
  { country: "Ukraine", currency: "UAH", symbol: "₴", phoneCode: "+380" },
  { country: "Vietnam", currency: "VND", symbol: "₫", phoneCode: "+84" },
  { country: "Yemen", currency: "YER", symbol: "YR", phoneCode: "+967" },
];
