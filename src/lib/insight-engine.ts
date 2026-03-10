/**
 * FinnyLand Rule-Based Insight Engine
 * 
 * Generates warm, human-style, data-driven insights across 8 categories.
 * No AI models — pure logic from user's actual finance data.
 */

import type { AppData, ForecastItem, AccountType } from "./finance-types";
import {
  formatMoney, formatDate, toMonthlyAmount,
  daysBetween, getRiskDate, todayStr, getNextOccurrence,
  getMonthSubscriptionTotal, computeForecast, computeBalanceAtPosition,
  computeInvestmentValue,
} from "./finance-utils";
import { computeAccountForecasts, computeCreditCardBills } from "./account-forecast";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";

export type InsightTone = "positive" | "neutral" | "warning" | "danger" | "opportunity";
export type InsightCategory = "spending" | "cashflow" | "opportunity" | "warning" | "goal" | "debt" | "family" | "reminder";

export interface Insight {
  text: string;
  tone: InsightTone;
  category: InsightCategory;
  priority: number; // 1 = highest
  icon: string; // emoji
}

// ─── Helpers ─────────────────────────────────────────────────

function fm(n: number, data: AppData): string {
  return formatMoney(n, data.userProfile);
}

interface MonthData {
  categories: Record<string, number>;
  totalIncome: number;
  totalExpense: number;
}

function getMonthExpenses(data: AppData, monthsAgo: number): MonthData {
  const today = data.positionDate || todayStr();
  const refDate = parseISO(today);
  const d = subMonths(refDate, monthsAgo);
  const ms = format(startOfMonth(d), "yyyy-MM-dd");
  const me = format(endOfMonth(d), "yyyy-MM-dd");
  const categories: Record<string, number> = {};
  let totalIncome = 0, totalExpense = 0;

  for (const entry of data.entries) {
    if (!entry.includeInForecast) continue;
    if (entry.category === "Debt Payoff") continue;
    let dd = entry.date;
    while (dd <= me) {
      if (dd >= ms) {
        if (entry.amount >= 0) totalIncome += entry.amount;
        else {
          totalExpense += Math.abs(entry.amount);
          categories[entry.category] = (categories[entry.category] || 0) + Math.abs(entry.amount);
        }
      }
      if (entry.frequency === "once") break;
      dd = getNextOccurrence(dd, entry.frequency);
    }
  }
  for (const sub of data.subscriptions) {
    if (!sub.includeInForecast) continue;
    const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
    let dd = chargeStart;
    while (dd <= me) {
      if (dd >= ms) {
        totalExpense += sub.amount;
        categories[sub.category] = (categories[sub.category] || 0) + sub.amount;
      }
      if (sub.frequency === "once") break;
      dd = getNextOccurrence(dd, sub.frequency);
    }
  }
  return { categories, totalIncome, totalExpense };
}

// ─── Category Generators ─────────────────────────────────────

function spendingInsights(data: AppData, current: MonthData, previous: MonthData): Insight[] {
  const items: Insight[] = [];
  const f = (n: number) => fm(n, data);

  // Overall spending trend
  if (previous.totalExpense > 0 && current.totalExpense > 0) {
    const pctChange = ((current.totalExpense - previous.totalExpense) / previous.totalExpense) * 100;
    if (pctChange > 20) {
      items.push({
        text: `Spending jumped about ${Math.round(pctChange)}% from last month. Might be worth a quick look at what's growing.`,
        tone: "warning", category: "spending", priority: 2, icon: "📈",
      });
    } else if (pctChange > 5) {
      items.push({
        text: `Spending crept up a little from last month — not a lot, but worth watching.`,
        tone: "neutral", category: "spending", priority: 4, icon: "📊",
      });
    } else if (pctChange < -15) {
      items.push({
        text: `Nice! You spent ${Math.round(Math.abs(pctChange))}% less than last month. Whatever you did, keep it up 💪`,
        tone: "positive", category: "spending", priority: 3, icon: "🌿",
      });
    } else if (pctChange < -5) {
      items.push({
        text: `Spending is trending down slightly compared to last month — good direction.`,
        tone: "positive", category: "spending", priority: 4, icon: "✅",
      });
    }
  }

  // Per-category trends
  const trackCategories = ["Food", "Transport", "Shopping", "Entertainment", "Health", "Utilities"];
  const friendlyNames: Record<string, string> = {
    Food: "Groceries & food", Transport: "Fuel & transport", Shopping: "Shopping",
    Entertainment: "Entertainment", Health: "Health", Utilities: "Utilities",
  };

  for (const cat of trackCategories) {
    const curr = current.categories[cat] || 0;
    const prev = previous.categories[cat] || 0;
    if (prev > 0 && curr > 0) {
      const change = ((curr - prev) / prev) * 100;
      const name = friendlyNames[cat] || cat;
      if (change > 30) {
        items.push({
          text: `${name} ${change > 60 ? "shot up" : "is climbing"} compared to last month. If this keeps going, it may push your total higher.`,
          tone: "warning", category: "spending", priority: 3, icon: "🔥",
        });
      } else if (change < -25) {
        items.push({
          text: `You cut down on ${name.toLowerCase()} this month — nice move.`,
          tone: "positive", category: "spending", priority: 5, icon: "🌱",
        });
      }
    }
  }

  // Dominant category
  const totalExp = current.totalExpense;
  if (totalExp > 0) {
    const sorted = Object.entries(current.categories).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const [topCat, topAmt] = sorted[0];
      const pct = Math.round((topAmt / totalExp) * 100);
      if (pct >= 40) {
        items.push({
          text: `Most of your money is going into ${topCat.toLowerCase()} right now — it's ${pct}% of all spending.`,
          tone: "neutral", category: "spending", priority: 4, icon: "📌",
        });
      }
    }
  }

  return items;
}

function cashFlowInsights(data: AppData, current: MonthData, previous: MonthData, effectiveBalance: number): Insight[] {
  const items: Insight[] = [];
  const f = (n: number) => fm(n, data);
  const today = data.positionDate || todayStr();

  const currentNet = current.totalIncome - current.totalExpense;
  const previousNet = previous.totalIncome - previous.totalExpense;

  // Month-over-month breathing room
  if (current.totalIncome > 0 && previous.totalIncome > 0) {
    if (currentNet > previousNet && currentNet > 0 && previousNet > 0) {
      items.push({
        text: `This month feels a bit easier — you have ${f(currentNet - previousNet)} more room than last month.`,
        tone: "positive", category: "cashflow", priority: 3, icon: "💓",
      });
    } else if (currentNet < previousNet && currentNet > 0) {
      items.push({
        text: `This month looks a bit tighter than last month. Still positive, but margins are thinner.`,
        tone: "neutral", category: "cashflow", priority: 3, icon: "💓",
      });
    }
  }

  if (currentNet < 0 && current.totalIncome > 0) {
    items.push({
      text: `You're spending more than you're earning this month. Let's see if there's something we can trim.`,
      tone: "danger", category: "cashflow", priority: 1, icon: "⚠️",
    });
  }

  // Salary dependency
  if (current.totalIncome > 0) {
    const salaryEntries = data.entries.filter(e =>
      e.amount > 0 && e.includeInForecast && e.category === "Salary"
    );
    const salaryTotal = salaryEntries.reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);
    if (salaryTotal > current.totalIncome * 0.85 && current.totalIncome > 0) {
      items.push({
        text: `Your salary is doing most of the heavy lifting this month. A side income buffer could really help.`,
        tone: "neutral", category: "cashflow", priority: 5, icon: "💼",
      });
    }
  }

  // Upcoming inflow
  const nextInflow = data.entries
    .filter(e => e.amount > 0 && e.includeInForecast && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (nextInflow) {
    const days = daysBetween(today, nextInflow.date);
    if (days >= 0 && days <= 5) {
      items.push({
        text: `${nextInflow.label} is ${days === 0 ? "arriving today" : `coming in ${days} day${days !== 1 ? "s" : ""}`} — ${f(nextInflow.amount)} heading your way.`,
        tone: "positive", category: "cashflow", priority: 4, icon: "⚡",
      });
    }
  }

  // Account-level shortfall risk
  const { shortfalls } = computeAccountForecasts(data);
  const accountLabels: Record<AccountType, string> = { cash: "Cash", bank: "Bank", creditCard: "Credit Card" };
  const uniqueAccounts = new Set(shortfalls.slice(0, 3).map(s => s.account));
  for (const acct of uniqueAccounts) {
    const sf = shortfalls.find(s => s.account === acct)!;
    const days = daysBetween(today, sf.date);
    if (days > 0 && days <= 30) {
      items.push({
        text: `Your ${accountLabels[acct].toLowerCase()} may run short around ${formatDate(sf.date)} for "${sf.itemLabel}." You might need about ${f(sf.shortageAmount)} more.`,
        tone: "warning", category: "cashflow", priority: 2, icon: "🏦",
      });
    }
  }

  return items;
}

function opportunityInsights(data: AppData, current: MonthData, effectiveBalance: number): Insight[] {
  const items: Insight[] = [];
  const f = (n: number) => fm(n, data);

  // Healthy buffer → invest
  if (effectiveBalance > 0 && current.totalExpense > 0 && effectiveBalance > current.totalExpense * 3) {
    items.push({
      text: `You have a healthy buffer right now. This could be a good time to grow a goal or start investing.`,
      tone: "opportunity", category: "opportunity", priority: 4, icon: "✨",
    });
  }

  // Loan/EMI ending soon
  for (const entry of data.entries) {
    if (entry.frequency !== "once" && entry.amount < 0 && entry.includeInForecast && entry.debtLinkId) {
      // Check if there's a plan finishing soon
      const plan = data.debtPlans.find(p => p.linkedEntryIds?.includes(entry.id));
      if (plan) {
        const lastEntryDate = data.entries
          .filter(e => plan.linkedEntryIds?.includes(e.id))
          .map(e => e.date)
          .sort()
          .pop();
        if (lastEntryDate) {
          const today = data.positionDate || todayStr();
          const days = daysBetween(today, lastEntryDate);
          if (days > 0 && days <= 60) {
            items.push({
              text: `A debt payment is ending soon. That could free up room for a small goal or savings rhythm.`,
              tone: "opportunity", category: "opportunity", priority: 3, icon: "🎯",
            });
            break;
          }
        }
      }
    }
  }

  // Liability finishing soon
  for (const payoff of (data.liabilityPayoffs || [])) {
    if (payoff.status !== "active") continue;
    const today = data.positionDate || todayStr();
    const days = daysBetween(today, payoff.targetDate);
    if (days > 0 && days <= 90) {
      items.push({
        text: `Your ${payoff.name} payoff is finishing ${days <= 30 ? "soon" : `in about ${Math.round(days / 30)} months`}. That frees up ${f(payoff.payoffAmount)} each cycle.`,
        tone: "opportunity", category: "opportunity", priority: 3, icon: "🔓",
      });
    }
  }

  // Optional subscriptions savings
  const optionalCats = ["Entertainment", "Shopping"];
  const optionalTotal = data.subscriptions
    .filter(s => s.includeInForecast && optionalCats.includes(s.category))
    .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.frequency), 0);
  if (optionalTotal > 0 && current.totalIncome > 0 && optionalTotal > current.totalIncome * 0.05) {
    items.push({
      text: `You're spending ${f(optionalTotal)}/mo on entertainment & shopping subscriptions. Trimming one could free up room for a goal.`,
      tone: "opportunity", category: "opportunity", priority: 5, icon: "💡",
    });
  }

  // No goals yet
  const activeGoals = (data.goals || []).filter(g => g.status === "active");
  if (activeGoals.length === 0 && effectiveBalance > 0) {
    items.push({
      text: `You haven't set any goals yet. Even a small one can make your money feel more purposeful. Try the + button!`,
      tone: "opportunity", category: "opportunity", priority: 5, icon: "🎯",
    });
  }

  // Idle cash
  if (data.accountBalances.cash > 0 && current.totalExpense > 0 && data.accountBalances.cash > current.totalExpense * 2) {
    items.push({
      text: `You're holding a lot in cash. Some of it could work harder in a savings goal or short-term investment.`,
      tone: "opportunity", category: "opportunity", priority: 5, icon: "💰",
    });
  }

  return items;
}

function warningInsightsGen(data: AppData, current: MonthData, forecast: ForecastItem[]): Insight[] {
  const items: Insight[] = [];
  const f = (n: number) => fm(n, data);
  const today = data.positionDate || todayStr();

  // Subscription burden
  const monthSubs = getMonthSubscriptionTotal(data.subscriptions);
  if (current.totalIncome > 0 && monthSubs > 0) {
    const subPct = (monthSubs / current.totalIncome) * 100;
    if (subPct > 30) {
      items.push({
        text: `Your subscriptions are getting heavy — ${Math.round(subPct)}% of your income. Do you really use all of them?`,
        tone: "warning", category: "warning", priority: 2, icon: "📦",
      });
    } else if (subPct > 20) {
      items.push({
        text: `Subscriptions make up about ${Math.round(subPct)}% of your income. Worth reviewing once in a while.`,
        tone: "neutral", category: "warning", priority: 5, icon: "📦",
      });
    }
  }

  // Number of subscriptions
  const activeSubs = data.subscriptions.filter(s => s.includeInForecast);
  if (activeSubs.length >= 8) {
    items.push({
      text: `You have ${activeSubs.length} active subscriptions. That's a lot — are all of them earning their keep?`,
      tone: "warning", category: "warning", priority: 4, icon: "🔁",
    });
  }

  // Upcoming shortfall
  const riskDate = getRiskDate(forecast);
  if (riskDate) {
    const days = daysBetween(today, riskDate);
    if (days > 0 && days <= 14) {
      items.push({
        text: `Heads up — your overall balance could go negative in ${days} day${days !== 1 ? "s" : ""} around ${formatDate(riskDate)}. Let's plan ahead.`,
        tone: "danger", category: "warning", priority: 1, icon: "🚨",
      });
    } else if (days > 14 && days <= 60) {
      items.push({
        text: `There's a potential dip in about ${Math.round(days / 7)} weeks (${formatDate(riskDate)}). Keeping an eye on spending could help avoid it.`,
        tone: "warning", category: "warning", priority: 2, icon: "⚠️",
      });
    }
  }

  // Trial endings
  for (const sub of data.subscriptions) {
    if (sub.isTrial && sub.trialEndDate) {
      const days = daysBetween(today, sub.trialEndDate);
      if (days >= 0 && days <= 7) {
        items.push({
          text: `${sub.name} trial ends ${days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`} — cancel before the charge kicks in if you don't need it.`,
          tone: "warning", category: "warning", priority: 1, icon: "⏰",
        });
      }
    }
  }

  // Cheque reminders
  for (const entry of data.entries) {
    if (entry.isCheque && entry.includeInForecast) {
      const days = daysBetween(today, entry.date);
      if (days >= 0 && days <= 14) {
        items.push({
          text: `A cheque for "${entry.label}" is due ${days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`}. Make sure the funds are ready.`,
          tone: "warning", category: "warning", priority: 1, icon: "📄",
        });
      }
    }
  }

  // CC bill approaching
  const ccBills = computeCreditCardBills(data);
  for (const bill of ccBills.slice(0, 1)) {
    const days = daysBetween(today, bill.date);
    if (days >= 0 && days <= 14) {
      items.push({
        text: `Your credit card bill of ${f(bill.amount)} is coming up ${days <= 3 ? "very soon" : `in ${days} days`}. Keep your bank ready.`,
        tone: days <= 3 ? "danger" : "warning", category: "warning", priority: days <= 3 ? 1 : 2, icon: "💳",
      });
    }
  }

  // Spending pace is dangerous (current month on track to exceed income)
  if (current.totalIncome > 0 && current.totalExpense > 0) {
    const today2 = parseISO(today);
    const dayOfMonth = today2.getDate();
    if (dayOfMonth >= 10) {
      const projectedMonthExpense = (current.totalExpense / dayOfMonth) * 30;
      if (projectedMonthExpense > current.totalIncome * 1.1) {
        items.push({
          text: `At this pace, this month's spending could exceed your income. Slowing down a bit could help.`,
          tone: "warning", category: "warning", priority: 2, icon: "🔥",
        });
      }
    }
  }

  return items;
}

function goalInsightsGen(data: AppData): Insight[] {
  const items: Insight[] = [];
  const today = data.positionDate || todayStr();
  const f = (n: number) => fm(n, data);

  const activeGoals = (data.goals || []).filter(g => g.status === "active");

  for (const goal of activeGoals.slice(0, 3)) {
    const monthsLeft = Math.max(0, Math.round(daysBetween(today, goal.targetDate) / 30));

    if (monthsLeft <= 1) {
      items.push({
        text: `Your "${goal.name}" goal is almost there! Just ${monthsLeft <= 0 ? "days" : "about a month"} to go 🎉`,
        tone: "positive", category: "goal", priority: 2, icon: "🏆",
      });
    } else if (monthsLeft <= 3) {
      items.push({
        text: `"${goal.name}" is just ${monthsLeft} months away. Stay consistent — you're close!`,
        tone: "positive", category: "goal", priority: 3, icon: "🎯",
      });
    } else {
      items.push({
        text: `"${goal.name}" is progressing — ${monthsLeft} months to go. Keep the rhythm going.`,
        tone: "neutral", category: "goal", priority: 5, icon: "🎯",
      });
    }
  }

  // Goal contribution total vs income
  if (activeGoals.length > 0) {
    const totalContrib = activeGoals.reduce((sum, g) => sum + toMonthlyAmount(g.contributionAmount, g.contributionFrequency), 0);
    const monthlyIncome = data.entries
      .filter(e => e.amount > 0 && e.includeInForecast)
      .reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);

    if (monthlyIncome > 0 && totalContrib > monthlyIncome * 0.4) {
      items.push({
        text: `Your goals are taking ${Math.round((totalContrib / monthlyIncome) * 100)}% of your income. That's ambitious — make sure daily expenses are comfortable.`,
        tone: "warning", category: "goal", priority: 3, icon: "⚖️",
      });
    }
  }

  return items;
}

function debtInsightsGen(data: AppData, current: MonthData): Insight[] {
  const items: Insight[] = [];
  const today = data.positionDate || todayStr();
  const f = (n: number) => fm(n, data);

  // Active liability payoffs
  const activePayoffs = (data.liabilityPayoffs || []).filter(p => p.status === "active");

  // Total debt burden
  const monthlyDebtPayments = activePayoffs.reduce((sum, p) =>
    sum + toMonthlyAmount(p.payoffAmount, p.payoffFrequency), 0);

  if (monthlyDebtPayments > 0 && current.totalIncome > 0) {
    const debtPct = (monthlyDebtPayments / current.totalIncome) * 100;
    if (debtPct > 40) {
      items.push({
        text: `Debt payments are taking about ${Math.round(debtPct)}% of your income. That's a heavy load — focus on reducing one at a time.`,
        tone: "danger", category: "debt", priority: 2, icon: "⛓️",
      });
    } else if (debtPct > 20) {
      items.push({
        text: `About ${Math.round(debtPct)}% of your income goes to debt. Manageable, but worth keeping an eye on.`,
        tone: "neutral", category: "debt", priority: 4, icon: "📋",
      });
    }
  }

  // Individual payoff progress
  for (const payoff of activePayoffs.slice(0, 2)) {
    const monthsLeft = Math.max(0, Math.round(daysBetween(today, payoff.targetDate) / 30));
    if (monthsLeft <= 3 && monthsLeft > 0) {
      items.push({
        text: `${payoff.name} is almost done — just ${monthsLeft} month${monthsLeft !== 1 ? "s" : ""} left. You're getting closer to freedom.`,
        tone: "positive", category: "debt", priority: 2, icon: "🔓",
      });
    } else if (monthsLeft > 3) {
      items.push({
        text: `${payoff.name} payoff: ${monthsLeft} months remaining. Hang in there — steady progress wins.`,
        tone: "neutral", category: "debt", priority: 5, icon: "📊",
      });
    }
  }

  // Debt plans (received/given)
  const activeDebtEntries = data.entries.filter(e => e.debtLinkId && e.includeInForecast);
  const upcomingDebtPayments = activeDebtEntries.filter(e => {
    const days = daysBetween(today, e.date);
    return days >= 0 && days <= 14;
  });

  for (const entry of upcomingDebtPayments.slice(0, 2)) {
    const days = daysBetween(today, entry.date);
    const isRepayment = entry.debtType === "repayment";
    items.push({
      text: isRepayment
        ? `A debt repayment for "${entry.label}" is due ${days <= 1 ? "very soon" : `in ${days} days`}. Keep the funds ready.`
        : `A recovery for "${entry.label}" is expected ${days <= 1 ? "very soon" : `in ${days} days`}.`,
      tone: isRepayment ? "warning" : "positive",
      category: "debt", priority: 2, icon: isRepayment ? "💸" : "💰",
    });
  }

  // Suggest paying off debt before investing
  const hasInvestments = (data.investments || []).filter(i => i.includeInForecast).length > 0;
  if (hasInvestments && monthlyDebtPayments > 0 && current.totalIncome > 0) {
    const debtPct = (monthlyDebtPayments / current.totalIncome) * 100;
    if (debtPct > 30) {
      items.push({
        text: `With debt this heavy, it may be wiser to finish a payoff before adding more investments.`,
        tone: "neutral", category: "debt", priority: 4, icon: "💭",
      });
    }
  }

  return items;
}

function reminderInsightsGen(data: AppData): Insight[] {
  const items: Insight[] = [];
  const today = data.positionDate || todayStr();
  const f = (n: number) => fm(n, data);

  // Due subscriptions (3-14 days)
  for (const sub of data.subscriptions) {
    if (!sub.includeInForecast) continue;
    if (sub.isTrial && sub.trialEndDate) continue; // handled by warnings
    const days = daysBetween(today, sub.nextDate);
    if (days >= 3 && days <= 14) {
      items.push({
        text: `${sub.name} renewal is coming up in ${days} days (${f(sub.amount)}).`,
        tone: "neutral", category: "reminder", priority: 5, icon: "🔔",
      });
    }
  }

  // Upcoming salary
  const salaryEntries = data.entries.filter(e =>
    e.amount > 0 && e.includeInForecast && e.category === "Salary" && e.date >= today
  ).sort((a, b) => a.date.localeCompare(b.date));
  if (salaryEntries.length > 0) {
    const days = daysBetween(today, salaryEntries[0].date);
    if (days >= 1 && days <= 7) {
      items.push({
        text: `Salary is close (${days} day${days !== 1 ? "s" : ""}) — this month may ease up a little.`,
        tone: "positive", category: "reminder", priority: 4, icon: "💼",
      });
    }
  }

  // Upcoming goal contributions
  const activeGoals = (data.goals || []).filter(g => g.status === "active");
  for (const goal of activeGoals) {
    if (goal.linkedEntryIds) {
      const nextContrib = data.entries
        .filter(e => goal.linkedEntryIds!.includes(e.id) && e.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      if (nextContrib) {
        const days = daysBetween(today, nextContrib.date);
        if (days >= 0 && days <= 7) {
          items.push({
            text: `A contribution for "${goal.name}" is due ${days <= 1 ? "soon" : `in ${days} days`}. Staying on track!`,
            tone: "neutral", category: "reminder", priority: 4, icon: "🎯",
          });
          break; // only one goal reminder
        }
      }
    }
  }

  return items;
}

function familyInsightsGen(data: AppData): Insight[] {
  const items: Insight[] = [];
  const fd = data.familyData;
  if (!fd) return items;

  // Pending requests
  const pendingRequests = fd.requests.filter(r => r.status === "pending");
  if (pendingRequests.length > 0) {
    items.push({
      text: `${pendingRequests.length === 1 ? "A family request is" : `${pendingRequests.length} family requests are`} still waiting for approval.`,
      tone: "warning", category: "family", priority: 2, icon: "👨‍👩‍👧",
    });
  }

  // Shared goals progress
  for (const goal of fd.sharedGoals.slice(0, 2)) {
    const totalContrib = goal.contributions.reduce((s, c) => s + c.amount, 0);
    const pct = goal.targetAmount > 0 ? Math.round((totalContrib / goal.targetAmount) * 100) : 0;
    if (pct >= 80) {
      items.push({
        text: `Your shared goal "${goal.name}" is almost there — ${pct}% done! 🎉`,
        tone: "positive", category: "family", priority: 3, icon: "🎯",
      });
    } else if (pct >= 30) {
      items.push({
        text: `Your shared goal "${goal.name}" is moving nicely — ${pct}% so far.`,
        tone: "positive", category: "family", priority: 5, icon: "🌟",
      });
    }
  }

  // Piggy bank reminders
  for (const pb of fd.piggyBanks) {
    if (pb.currentAmount >= pb.targetAmount) {
      items.push({
        text: `${pb.childName}'s piggy bank is full! Time to celebrate 🎊`,
        tone: "positive", category: "family", priority: 3, icon: "🐷",
      });
    } else {
      const pct = Math.round((pb.currentAmount / pb.targetAmount) * 100);
      if (pct < 50) {
        items.push({
          text: `${pb.childName}'s piggy bank could use a top-up — it's at ${pct}%.`,
          tone: "neutral", category: "family", priority: 5, icon: "🐷",
        });
      }
    }
  }

  return items;
}

// ─── Main Engine ─────────────────────────────────────────────

export function generateInsights(data: AppData): {
  top: Insight[];          // 2-4 for Overview hero
  spending: Insight[];
  cashflow: Insight[];
  opportunity: Insight[];
  warning: Insight[];
  goal: Insight[];
  debt: Insight[];
  reminder: Insight[];
  all: Insight[];
} {
  const current = getMonthExpenses(data, 0);
  const previous = getMonthExpenses(data, 1);
  const effectiveBalance = computeBalanceAtPosition(data);
  const effectiveData = { ...data, currentBalance: effectiveBalance };
  const forecast = computeForecast(effectiveData);

  const spending = spendingInsights(data, current, previous);
  const cashflow = cashFlowInsights(data, current, previous, effectiveBalance);
  const opportunity = opportunityInsights(data, current, effectiveBalance);
  const warning = warningInsightsGen(data, current, forecast);
  const goal = goalInsightsGen(data);
  const debt = debtInsightsGen(data, current);
  const reminder = reminderInsightsGen(data);

  const family = familyInsightsGen(data);

  const all = [...spending, ...cashflow, ...opportunity, ...warning, ...goal, ...debt, ...family, ...reminder];

  // Deduplicate by similar text patterns
  const seen = new Set<string>();
  const deduped = all.filter(item => {
    const key = item.text.slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by priority
  const sorted = deduped.sort((a, b) => a.priority - b.priority);

  // Top insights: pick 2-4 highest priority, diverse categories
  const top: Insight[] = [];
  const usedCategories = new Set<InsightCategory>();
  for (const item of sorted) {
    if (top.length >= 4) break;
    // Prefer diverse categories
    if (top.length >= 2 && usedCategories.has(item.category)) continue;
    top.push(item);
    usedCategories.add(item.category);
  }

  return {
    top,
    spending: spending.sort((a, b) => a.priority - b.priority).slice(0, 3),
    cashflow: cashflow.sort((a, b) => a.priority - b.priority).slice(0, 3),
    opportunity: opportunity.sort((a, b) => a.priority - b.priority).slice(0, 3),
    warning: warning.sort((a, b) => a.priority - b.priority).slice(0, 4),
    goal: goal.sort((a, b) => a.priority - b.priority).slice(0, 3),
    debt: debt.sort((a, b) => a.priority - b.priority).slice(0, 3),
    reminder: reminder.sort((a, b) => a.priority - b.priority).slice(0, 3),
    all: sorted,
  };
}

/**
 * Generate a contextual insight after a transaction is added.
 * Returns null if no relevant insight.
 */
export function getContextualInsight(data: AppData, category: string, amount: number, type: "income" | "expense"): string | null {
  const current = getMonthExpenses(data, 0);
  const previous = getMonthExpenses(data, 1);

  if (type === "expense") {
    const currCat = current.categories[category] || 0;
    const prevCat = previous.categories[category] || 0;

    if (prevCat > 0 && currCat > prevCat * 1.2) {
      return `That pushes ${category.toLowerCase()} a bit higher than your recent pattern.`;
    }

    const monthSubs = getMonthSubscriptionTotal(data.subscriptions);
    if (category === "Subscription" && monthSubs > 0) {
      return `Subscriptions are stacking up this month.`;
    }

    if (data.entries.some(e => e.debtLinkId && e.category === category)) {
      return `Nice — that debt is getting lighter.`;
    }
  }

  if (type === "income") {
    if (category === "Salary") {
      return `This gives you a little more breathing room this month.`;
    }
    if (amount > 0) {
      return `That's a nice addition to your balance.`;
    }
  }

  return null;
}
