import { format, addMonths, parseISO } from "date-fns";
import type {
  AppData, AccountType, AccountShortfall, TransferSuggestion,
  CreditCardBillItem, ForecastItem, AccountForecastItem, Transfer,
} from "./finance-types";
import { getNextOccurrence, todayStr, addDays, computeInvestmentValue } from "./finance-utils";

const DEFAULT_SETTINGS = {
  creditCardBillDay: 15,
  transferSuggestionsEnabled: true,
  transferLeadDays: 1,
  includeCreditCardInBalance: false,
};

export function getSettings(data: AppData) {
  return { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

/** Get the next CC bill payment date after a given date */
export function getNextBillDate(afterDate: string, billDay: number): string {
  const d = parseISO(afterDate);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = Math.min(billDay, 28);

  // If expense date is before bill day this month, bill is this month
  // Otherwise bill is next month
  let billDate = new Date(year, month, day);
  if (d.getDate() >= day) {
    billDate = addMonths(billDate, 1);
  }
  // Actually: expenses in current cycle get billed next cycle
  // So always push to next month's bill date
  billDate = new Date(year, month + 1, day);
  if (billDate <= d) {
    billDate = addMonths(billDate, 1);
  }

  return format(billDate, "yyyy-MM-dd");
}

/** Collect all CC expenses and group them by bill payment date */
export function computeCreditCardBills(data: AppData): CreditCardBillItem[] {
  const settings = getSettings(data);
  const refDate = data.positionDate || todayStr();
  const horizon = data.forecastDate;
  const billMap: Record<string, number> = {};

  // CC expenses from entries
  for (const entry of data.entries) {
    if (!entry.includeInForecast || entry.amount >= 0 || entry.account !== "creditCard") continue;
    let d = entry.date;
    while (d <= horizon) {
      if (d >= refDate) {
        const billDate = getNextBillDate(d, settings.creditCardBillDay);
        if (billDate <= horizon) {
          billMap[billDate] = (billMap[billDate] || 0) + Math.abs(entry.amount);
        }
      }
      if (entry.frequency === "once") break;
      d = getNextOccurrence(d, entry.frequency);
    }
  }

  // CC expenses from subscriptions
  for (const sub of data.subscriptions) {
    if (!sub.includeInForecast || sub.account !== "creditCard") continue;
    const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
    let d = chargeStart;
    while (d <= horizon) {
      if (d >= refDate) {
        const billDate = getNextBillDate(d, settings.creditCardBillDay);
        if (billDate <= horizon) {
          billMap[billDate] = (billMap[billDate] || 0) + sub.amount;
        }
      }
      if (sub.frequency === "once") break;
      d = getNextOccurrence(d, sub.frequency);
    }
  }

  // CC investments
  for (const inv of (data.investments || [])) {
    if (!inv.includeInForecast || inv.account !== "creditCard") continue;
    let d = inv.startDate;
    while (d <= horizon && d <= inv.endDate) {
      if (d >= refDate) {
        const billDate = getNextBillDate(d, settings.creditCardBillDay);
        if (billDate <= horizon) {
          billMap[billDate] = (billMap[billDate] || 0) + inv.amount;
        }
      }
      if (inv.frequency === "once") break;
      d = getNextOccurrence(d, inv.frequency);
    }
  }

  return Object.entries(billMap)
    .filter(([_, amount]) => amount > 0.01)
    .map(([date, amount]) => ({
      date,
      amount,
      label: "Credit Card Bill Payment",
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Compute per-account running balances over time and detect shortfalls */
export function computeAccountForecasts(data: AppData): {
  accountItems: Record<AccountType, AccountForecastItem[]>;
  shortfalls: AccountShortfall[];
} {
  const refDate = data.positionDate || todayStr();
  const horizon = data.forecastDate;
  const settings = getSettings(data);

  // Build timeline of all events with account info
  type Event = { date: string; account: AccountType; amount: number; label: string; type: string };
  const events: Event[] = [];

  // Entries
  for (const entry of data.entries) {
    if (!entry.includeInForecast) continue;
    let d = entry.date;
    while (d <= horizon) {
      if (d >= refDate) {
        if (entry.account === "creditCard" && entry.amount < 0) {
          // CC expense: reduces CC limit immediately
          events.push({ date: d, account: "creditCard", amount: entry.amount, label: entry.label, type: "expense" });
        } else {
          events.push({ date: d, account: entry.account, amount: entry.amount, label: entry.label, type: entry.amount >= 0 ? "income" : "expense" });
        }
      }
      if (entry.frequency === "once") break;
      d = getNextOccurrence(d, entry.frequency);
    }
  }

  // Subscriptions
  for (const sub of data.subscriptions) {
    if (!sub.includeInForecast) continue;
    const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
    let d = chargeStart;
    while (d <= horizon) {
      if (d >= refDate) {
        if (sub.account === "creditCard") {
          events.push({ date: d, account: "creditCard", amount: -sub.amount, label: sub.name, type: "subscription" });
        } else {
          events.push({ date: d, account: sub.account, amount: -sub.amount, label: sub.name, type: "subscription" });
        }
      }
      if (sub.frequency === "once") break;
      d = getNextOccurrence(d, sub.frequency);
    }
  }

  // Investments
  for (const inv of (data.investments || [])) {
    if (!inv.includeInForecast) continue;
    let d = inv.startDate;
    while (d <= horizon && d <= inv.endDate) {
      if (d >= refDate) {
        if (inv.account === "creditCard") {
          events.push({ date: d, account: "creditCard", amount: -inv.amount, label: `${inv.name} (Investment)`, type: "investment" });
        } else {
          events.push({ date: d, account: inv.account, amount: -inv.amount, label: `${inv.name} (Investment)`, type: "investment" });
        }
      }
      if (inv.frequency === "once") break;
      d = getNextOccurrence(d, inv.frequency);
    }
    // Maturity
    if (inv.endDate >= refDate && inv.endDate <= horizon) {
      const { maturityValue } = computeInvestmentValue(inv, inv.endDate);
      events.push({ date: inv.endDate, account: inv.account, amount: maturityValue, label: `${inv.name} (Maturity)`, type: "income" });
    }
  }

  // Applied transfers
  for (const tr of (data.transfers || [])) {
    if (!tr.isApplied) continue;
    events.push({ date: tr.date, account: tr.fromAccount, amount: -tr.amount, label: `Transfer to ${tr.toAccount}`, type: "transfer" });
    events.push({ date: tr.date, account: tr.toAccount, amount: tr.amount, label: `Transfer from ${tr.fromAccount}`, type: "transfer" });
  }

  // CC bill payments (Bank → CC)
  const ccBills = computeCreditCardBills(data);
  for (const bill of ccBills) {
    events.push({ date: bill.date, account: "bank", amount: -bill.amount, label: bill.label, type: "cc_bill" });
    events.push({ date: bill.date, account: "creditCard", amount: bill.amount, label: "CC Limit Restored", type: "cc_bill" });
  }

  // Sort by date
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Build per-account running balances
  const balances: Record<AccountType, number> = {
    cash: data.accountBalances.cash,
    bank: data.accountBalances.bank,
    creditCard: data.accountBalances.creditCard,
  };

  const accountItems: Record<AccountType, AccountForecastItem[]> = {
    cash: [], bank: [], creditCard: [],
  };

  const shortfalls: AccountShortfall[] = [];
  const seenShortfalls = new Set<string>();

  for (const ev of events) {
    const acct = ev.account || "bank";
    if (!balances.hasOwnProperty(acct)) continue;
    
    const prevBal = balances[acct];
    balances[acct] += ev.amount;

    if (!accountItems[acct]) accountItems[acct] = [];
    accountItems[acct].push({
      date: ev.date,
      label: ev.label,
      amount: ev.amount,
      runningBalance: balances[acct],
      type: ev.type,
    });

    // Check shortfall
    if (balances[acct] < -0.01 && ev.amount < 0) {
      const key = `${ev.date}-${acct}-${ev.label}`;
      if (!seenShortfalls.has(key)) {
        seenShortfalls.add(key);
        shortfalls.push({
          date: ev.date,
          account: acct,
          itemLabel: ev.label,
          requiredAmount: Math.abs(ev.amount),
          availableAmount: Math.max(0, prevBal),
          shortageAmount: Math.abs(balances[acct]),
        });
      }
    }
  }

  return { accountItems, shortfalls };
}

/** Generate transfer suggestions to cover shortfalls */
export function generateTransferSuggestions(data: AppData): TransferSuggestion[] {
  const settings = getSettings(data);
  if (!settings.transferSuggestionsEnabled) return [];

  const { shortfalls } = computeAccountForecasts(data);
  const suggestions: TransferSuggestion[] = [];

  // Simple simulation: for each shortfall, try to find a source
  for (const sf of shortfalls) {
    const leadDays = settings.transferLeadDays;
    const suggestedDate = leadDays > 0 ? addDays(sf.date, -leadDays) : sf.date;
    const needed = sf.shortageAmount;

    // Priority: bank > cash > creditCard (skip same account)
    const sources: AccountType[] = ["bank", "cash", "creditCard"].filter(a => a !== sf.account) as AccountType[];

    let found = false;
    for (const source of sources) {
      // Rough check: does source have enough at start? (simplified)
      const sourceBalance = data.accountBalances[source];
      if (sourceBalance >= needed) {
        suggestions.push({
          fromAccount: source,
          toAccount: sf.account,
          amount: needed,
          suggestedDate,
          reason: `Cover ${sf.itemLabel} on ${sf.date}`,
          linkedItemLabel: sf.itemLabel,
          feasibility: "feasible",
        });
        found = true;
        break;
      } else if (sourceBalance > 0 && sourceBalance >= needed * 0.5) {
        suggestions.push({
          fromAccount: source,
          toAccount: sf.account,
          amount: needed,
          suggestedDate,
          reason: `Cover ${sf.itemLabel} on ${sf.date}`,
          linkedItemLabel: sf.itemLabel,
          feasibility: "risky",
        });
        found = true;
        break;
      }
    }

    if (!found) {
      suggestions.push({
        fromAccount: "bank",
        toAccount: sf.account,
        amount: needed,
        suggestedDate,
        reason: `Cover ${sf.itemLabel} on ${sf.date} — no feasible source found`,
        linkedItemLabel: sf.itemLabel,
        feasibility: "not_feasible",
      });
    }
  }

  return suggestions;
}

/** Get account-specific insights */
export function getAccountInsights(data: AppData): string[] {
  const settings = getSettings(data);
  const insights: string[] = [];
  const { shortfalls } = computeAccountForecasts(data);
  const suggestions = generateTransferSuggestions(data);

  const accountLabels: Record<AccountType, string> = { cash: "Cash", bank: "Bank", creditCard: "Credit Card" };

  for (const sf of shortfalls.slice(0, 3)) {
    insights.push(
      `${accountLabels[sf.account]} balance may be insufficient for "${sf.itemLabel}" on ${sf.date} (short by ${sf.shortageAmount.toFixed(2)}).`
    );
  }

  for (const sg of suggestions.slice(0, 3)) {
    if (sg.feasibility === "feasible") {
      insights.push(
        `Move ${sg.amount.toFixed(2)} from ${accountLabels[sg.fromAccount]} to ${accountLabels[sg.toAccount]} on ${sg.suggestedDate} to cover ${sg.linkedItemLabel}.`
      );
    } else if (sg.feasibility === "not_feasible") {
      insights.push(
        `No feasible transfer available for "${sg.linkedItemLabel}" — consider adjusting.`
      );
    }
  }

  // CC bill warnings
  const ccBills = computeCreditCardBills(data);
  for (const bill of ccBills.slice(0, 2)) {
    if (bill.amount > data.accountBalances.bank * 0.8) {
      insights.push(
        `Bank balance may be tight for CC bill of ${bill.amount.toFixed(2)} on ${bill.date}.`
      );
    }
  }

  return insights;
}
