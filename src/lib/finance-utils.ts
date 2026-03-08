import { format, addDays as dfnsAddDays, differenceInCalendarDays, addWeeks, addMonths, addYears, parseISO, isBefore, isAfter } from "date-fns";
import type { AppData, Entry, ForecastItem, Frequency, Investment, Subscription } from "./finance-types";

export const todayStr = () => format(new Date(), "yyyy-MM-dd");

export const addDays = (dateStr: string, days: number) =>
  format(dfnsAddDays(parseISO(dateStr), days), "yyyy-MM-dd");

export const formatMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

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
    currentBalance: 4250.0,
    forecastDate: addDays(today, 180),
    subscriptions: [
      { id: generateId(), name: "Netflix", amount: 15.99, frequency: "monthly", nextDate: addDays(today, 12), category: "Entertainment", includeInForecast: true },
      { id: generateId(), name: "Spotify", amount: 9.99, frequency: "monthly", nextDate: addDays(today, 5), category: "Entertainment", includeInForecast: true },
      { id: generateId(), name: "AWS", amount: 45.0, frequency: "monthly", nextDate: addDays(today, 18), category: "Tech", includeInForecast: true },
      { id: generateId(), name: "Gym", amount: 29.99, frequency: "monthly", nextDate: addDays(today, 3), category: "Health", includeInForecast: true },
      { id: generateId(), name: "Adobe CC", amount: 54.99, frequency: "monthly", nextDate: addDays(today, 25), category: "Tech", includeInForecast: true, isTrial: true, trialEndDate: addDays(today, 6) },
    ],
    entries: [
      { id: generateId(), label: "Salary", amount: 3800, date: addDays(today, 15), frequency: "monthly", category: "Income", includeInForecast: true },
      { id: generateId(), label: "Freelance Project", amount: 1200, date: addDays(today, 22), frequency: "once", category: "Income", includeInForecast: true },
      { id: generateId(), label: "Rent", amount: -1500, date: addDays(today, 1), frequency: "monthly", category: "Housing", includeInForecast: true },
      { id: generateId(), label: "Groceries", amount: -400, date: addDays(today, 7), frequency: "monthly", category: "Food", includeInForecast: true },
      { id: generateId(), label: "Utilities", amount: -180, date: addDays(today, 10), frequency: "monthly", category: "Bills", includeInForecast: true },
    ],
    investments: [],
  };
}

// Investment compound interest calculations
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
  
  // Calculate total invested and future value using compound interest
  let totalInvested = 0;
  let futureValue = 0;
  let d = inv.startDate;
  
  while (d <= inv.endDate) {
    const monthsToEnd = Math.max(0, differenceInMonths(inv.endDate, d));
    const monthsToEval = Math.max(0, differenceInMonths(evalDate, d));
    
    if (d <= evalDate) {
      totalInvested += inv.amount;
      // Compound this installment from its date to evalDate
      futureValue += inv.amount * Math.pow(1 + monthlyRate, monthsToEval);
    }
    
    if (inv.frequency === "once") break;
    d = getNextOccurrence(d, inv.frequency);
  }
  
  const profit = futureValue - totalInvested;
  
  // Maturity value: all installments compounded to end date
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
    if (raw) return JSON.parse(raw);
  } catch {}
  const data = seedData();
  saveData(data);
  return data;
}

export function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function computeForecast(data: AppData): ForecastItem[] {
  const today = todayStr();
  const horizon = data.forecastDate > addDays(today, 180) ? data.forecastDate : addDays(today, 180);
  const items: ForecastItem[] = [];

  // Generate subscription occurrences
  for (const sub of data.subscriptions) {
    if (!sub.includeInForecast) continue;
    let d = sub.nextDate;
    while (d <= horizon) {
      if (d >= today) {
        items.push({ date: d, label: sub.name, amount: -sub.amount, balance: 0, type: "subscription" });
      }
      if (sub.frequency === "once") break;
      d = getNextOccurrence(d, sub.frequency);
    }
  }

  // Generate entry occurrences
  for (const entry of data.entries) {
    if (!entry.includeInForecast) continue;
    let d = entry.date;
    while (d <= horizon) {
      if (d >= today) {
        items.push({
          date: d,
          label: entry.label,
          amount: entry.amount,
          balance: 0,
          type: entry.amount >= 0 ? "income" : "expense",
        });
      }
      if (entry.frequency === "once") break;
      d = getNextOccurrence(d, entry.frequency);
    }
  }

  // Generate investment outflows and maturity inflows
  for (const inv of (data.investments || [])) {
    if (!inv.includeInForecast) continue;
    // Periodic investment outflows
    let d = inv.startDate;
    while (d <= horizon && d <= inv.endDate) {
      if (d >= today) {
        items.push({ date: d, label: `${inv.name} (Investment)`, amount: -inv.amount, balance: 0, type: "expense" });
      }
      if (inv.frequency === "once") break;
      d = getNextOccurrence(d, inv.frequency);
    }
    // Maturity inflow at end date
    if (inv.endDate >= today && inv.endDate <= horizon) {
      const { maturityValue } = computeInvestmentValue(inv, inv.endDate);
      items.push({ date: inv.endDate, label: `${inv.name} (Maturity)`, amount: maturityValue, balance: 0, type: "income" });
    }
  }

  items.sort((a, b) => a.date.localeCompare(b.date));

  let balance = data.currentBalance;
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
