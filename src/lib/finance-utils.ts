import { format, addDays as dfnsAddDays, differenceInCalendarDays, addWeeks, addMonths, addYears, parseISO } from "date-fns";
import type { AppData, Entry, ForecastItem, Frequency, Investment, Subscription, UserProfile } from "./finance-types";

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

export const addDays = (dateStr: string, days: number) =>
  format(dfnsAddDays(parseISO(dateStr), days), "yyyy-MM-dd");

export const formatMoney = (n: number, profile?: UserProfile) => {
  const symbol = profile?.currencySymbol || "$";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};

export const formatDate = (dateStr: string) =>
  format(parseISO(dateStr), "MMM d, yyyy");

export const daysBetween = (a: string, b: string) =>
  differenceInCalendarDays(parseISO(b), parseISO(a));

const STORAGE_KEY = "balance-by-date-mvp-v1";

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function getNextOccurrence(dateStr: string, freq: Frequency): string {
  const d = parseISO(dateStr);
  switch (freq) {
    case "daily": return format(dfnsAddDays(d, 1), "yyyy-MM-dd");
    case "weekly": return format(addWeeks(d, 1), "yyyy-MM-dd");
    case "biweekly": return format(addWeeks(d, 2), "yyyy-MM-dd");
    case "monthly": return format(addMonths(d, 1), "yyyy-MM-dd");
    case "quarterly": return format(addMonths(d, 3), "yyyy-MM-dd");
    case "halfyearly": return format(addMonths(d, 6), "yyyy-MM-dd");
    case "yearly": return format(addYears(d, 1), "yyyy-MM-dd");
    default: return dateStr;
  }
}

export function seedData(): AppData {
  const today = todayStr();
  return {
    currentBalance: 0,
    accountBalances: { cash: 0, bank: 0, creditCard: 0 },
    forecastDate: addDays(today, 180),
    positionDate: today,
    subscriptions: [],
    entries: [],
    investments: [],
    debtPlans: [],
    transfers: [],
    settings: {
      creditCardBillDay: 15,
      transferSuggestionsEnabled: true,
      transferLeadDays: 1,
      includeCreditCardInBalance: false,
    },
  };
}

export function getInvestmentOccurrences(inv: Investment, upToDate: string): number {
  let count = 0;
  let d = inv.startDate;
  while (d <= upToDate && d <= inv.endDate) {
    count++;
    if (inv.frequency === "once") break;
    d = getNextOccurrence(d, inv.frequency);
  }
  return count;
}

export function computeInvestmentValue(inv: Investment, asOfDate?: string) {
  const today = asOfDate || todayStr();
  const evalDate = today > inv.endDate ? inv.endDate : today;
  const monthlyRate = inv.expectedReturn / 100 / 12;
  
  let totalInvested = 0;
  let futureValue = 0;
  let d = inv.startDate;
  
  while (d <= inv.endDate) {
    const monthsToEval = Math.max(0, differenceInMonths(evalDate, d));
    if (d <= evalDate) {
      totalInvested += inv.amount;
      futureValue += inv.amount * Math.pow(1 + monthlyRate, monthsToEval);
    }
    if (inv.frequency === "once") break;
    d = getNextOccurrence(d, inv.frequency);
  }
  
  const profit = futureValue - totalInvested;
  
  let maturityValue = 0;
  let totalInvestedFull = 0;
  let dd = inv.startDate;
  while (dd <= inv.endDate) {
    const mToEnd = Math.max(0, differenceInMonths(inv.endDate, dd));
    maturityValue += inv.amount * Math.pow(1 + monthlyRate, mToEnd);
    totalInvestedFull += inv.amount;
    if (inv.frequency === "once") break;
    dd = getNextOccurrence(dd, inv.frequency);
  }
  
  return {
    totalInvested,
    currentValue: futureValue,
    profit,
    maturityValue,
    totalInvestedFull,
    maturityProfit: maturityValue - totalInvestedFull,
  };
}

function differenceInMonths(dateStrA: string, dateStrB: string): number {
  const a = parseISO(dateStrA);
  const b = parseISO(dateStrB);
  return (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());
}

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.accountBalances) {
        parsed.accountBalances = { cash: 0, bank: parsed.currentBalance || 0, creditCard: 0 };
      }
      if (!parsed.investments) parsed.investments = [];
      if (!parsed.debtPlans) parsed.debtPlans = [];
      if (!parsed.positionDate) parsed.positionDate = todayStr();
      return parsed;
    }
  } catch {}
  const data = seedData();
  saveData(data);
  return data;
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Compute effective balance at positionDate by simulating all transactions from actual today */
export function computeBalanceAtPosition(data: AppData): number {
  const actualToday = todayStr();
  const posDate = data.positionDate || actualToday;
  if (posDate <= actualToday) return data.currentBalance;
  
  let balance = data.currentBalance;
  
  for (const sub of data.subscriptions) {
    if (!sub.includeInForecast) continue;
    // Respect trial: skip charges before trialEndDate
    const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
    let d = chargeStart;
    while (d <= posDate) {
      if (d >= actualToday) balance -= sub.amount;
      if (sub.frequency === "once") break;
      d = getNextOccurrence(d, sub.frequency);
    }
  }
  
  for (const entry of data.entries) {
    if (!entry.includeInForecast) continue;
    let d = entry.date;
    while (d <= posDate) {
      if (d >= actualToday) balance += entry.amount;
      if (entry.frequency === "once") break;
      d = getNextOccurrence(d, entry.frequency);
    }
  }
  
  for (const inv of (data.investments || [])) {
    if (!inv.includeInForecast) continue;
    let d = inv.startDate;
    while (d <= posDate && d <= inv.endDate) {
      if (d >= actualToday) balance -= inv.amount;
      if (inv.frequency === "once") break;
      d = getNextOccurrence(d, inv.frequency);
    }
    if (inv.endDate >= actualToday && inv.endDate <= posDate) {
      const { maturityValue } = computeInvestmentValue(inv, inv.endDate);
      balance += maturityValue;
    }
  }
  
  return balance;
}

export function computeForecast(data: AppData): ForecastItem[] {
  const refDate = data.positionDate || todayStr();
  const effectiveBalance = computeBalanceAtPosition(data);
  const horizon = data.forecastDate > addDays(refDate, 180) ? data.forecastDate : addDays(refDate, 180);
  const items: ForecastItem[] = [];

  for (const sub of data.subscriptions) {
    if (!sub.includeInForecast) continue;
    // Respect trial: first charge starts at trialEndDate
    const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
    let d = chargeStart;
    while (d <= horizon) {
      if (d >= refDate) {
        items.push({ date: d, label: sub.name, amount: -sub.amount, balance: 0, type: "subscription" });
      }
      if (sub.frequency === "once") break;
      d = getNextOccurrence(d, sub.frequency);
    }
  }

  for (const entry of data.entries) {
    if (!entry.includeInForecast) continue;
    let d = entry.date;
    while (d <= horizon) {
      if (d >= refDate) {
        items.push({
          date: d,
          label: entry.label,
          amount: entry.amount,
          balance: 0,
          type: entry.amount >= 0 ? "income" : "expense",
          isCheque: entry.isCheque,
          isDebtLinked: !!entry.debtLinkId,
          isOptional: entry.isOptional,
        });
      }
      if (entry.frequency === "once") break;
      d = getNextOccurrence(d, entry.frequency);
    }
  }

  for (const inv of (data.investments || [])) {
    if (!inv.includeInForecast) continue;
    let d = inv.startDate;
    while (d <= horizon && d <= inv.endDate) {
      if (d >= refDate) {
        items.push({ date: d, label: `${inv.name} (Investment)`, amount: -inv.amount, balance: 0, type: "expense" });
      }
      if (inv.frequency === "once") break;
      d = getNextOccurrence(d, inv.frequency);
    }
    if (inv.endDate >= refDate && inv.endDate <= horizon) {
      const { maturityValue } = computeInvestmentValue(inv, inv.endDate);
      items.push({ date: inv.endDate, label: `${inv.name} (Maturity)`, amount: maturityValue, balance: 0, type: "income" });
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  let balance = effectiveBalance;
  for (const item of items) {
    balance += item.amount;
    item.balance = balance;
  }

  return items;
}

export function getBalanceOnDate(forecast: ForecastItem[], date: string, currentBalance: number): number {
  let bal = currentBalance;
  for (const item of forecast) {
    if (item.date > date) break;
    bal = item.balance;
  }
  return forecast.length === 0 || forecast[0].date > date ? currentBalance : bal;
}

export function getRiskDate(forecast: ForecastItem[]): string | null {
  for (const item of forecast) {
    if (item.balance < 0) return item.date;
  }
  return null;
}

export function toMonthlyAmount(amount: number, freq: Frequency): number {
  switch (freq) {
    case "daily": return amount * 30;
    case "weekly": return amount * 4.33;
    case "biweekly": return amount * 2.167;
    case "monthly": return amount;
    case "quarterly": return amount / 3;
    case "halfyearly": return amount / 6;
    case "yearly": return amount / 12;
    default: return amount;
  }
}

export function getMonthSubscriptionTotal(subscriptions: Subscription[]): number {
  return subscriptions.reduce((sum, s) => {
    if (!s.includeInForecast) return sum;
    return sum + toMonthlyAmount(s.amount, s.frequency);
  }, 0);
}
