import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { AlertBanner } from "@/components/AlertBanner";
import { ForecastChart } from "@/components/ForecastChart";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AppData, ForecastItem, AccountType, Entry, Subscription, Investment } from "@/lib/finance-types";
import {
  computeForecast, computeInvestmentValue, computeBalanceAtPosition,
  formatDate, formatMoney, getBalanceOnDate,
  getMonthSubscriptionTotal, getRiskDate, todayStr, daysBetween, toMonthlyAmount,
  getNextOccurrence,
} from "@/lib/finance-utils";
import { format, parseISO, startOfMonth, endOfMonth, subMonths, addMonths } from "date-fns";

type AccountFilter = "all" | AccountType;

interface TransactionsTabProps {
  data: AppData;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(210, 70%, 50%)",
  "hsl(340, 70%, 50%)", "hsl(160, 70%, 40%)",
];

const FILTER_LABELS: Record<AccountFilter, string> = { all: "All", cash: "Cash", bank: "Bank", creditCard: "Credit Card" };

export function TransactionsTab({ data }: TransactionsTabProps) {
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  // Filter data by account
  const filteredData = useMemo((): AppData => {
    if (accountFilter === "all") return data;
    return {
      ...data,
      entries: data.entries.filter(e => e.account === accountFilter),
      subscriptions: data.subscriptions.filter(s => s.account === accountFilter),
      investments: (data.investments || []).filter(i => i.account === accountFilter),
      currentBalance: data.accountBalances[accountFilter] || 0,
    };
  }, [data, accountFilter]);

  const today = data.positionDate || todayStr();

  // Compute effective balance at position date (simulates all transactions up to positionDate)
  const effectiveBalance = useMemo(() => computeBalanceAtPosition(filteredData), [filteredData]);

  const effectiveData = useMemo((): AppData => ({
    ...filteredData,
    currentBalance: effectiveBalance,
  }), [filteredData, effectiveBalance]);

  const forecast = useMemo(() => computeForecast(effectiveData), [effectiveData]);
  const forecastBalance = getBalanceOnDate(forecast, effectiveData.forecastDate, effectiveBalance);
  const monthSubs = getMonthSubscriptionTotal(effectiveData.subscriptions);
  const riskDate = getRiskDate(forecast);
  const upcoming = forecast.filter((f) => daysBetween(today, f.date) <= 30).slice(0, 10);

  // Bar chart click state
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<"income" | "expense" | null>(null);

  // Income vs expense bar chart (last 6 months) with line items
  const incomeExpenseBarData = useMemo(() => {
    const months: { month: string; monthKey: string; income: number; expense: number;
      incomeItems: { label: string; amount: number; date: string }[];
      expenseItems: { label: string; amount: number; date: string }[];
    }[] = [];
    const refDate = parseISO(today);
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(refDate, i);
      const ms = format(startOfMonth(d), "yyyy-MM-dd");
      const me = format(endOfMonth(d), "yyyy-MM-dd");
      let income = 0, expense = 0;
      const incomeItems: { label: string; amount: number; date: string }[] = [];
      const expenseItems: { label: string; amount: number; date: string }[] = [];

      for (const entry of filteredData.entries) {
        if (!entry.includeInForecast) continue;
        let dd = entry.date;
        while (dd <= me) {
          if (dd >= ms) {
            if (entry.amount >= 0) { income += entry.amount; incomeItems.push({ label: entry.label, amount: entry.amount, date: dd }); }
            else { expense += Math.abs(entry.amount); expenseItems.push({ label: entry.label, amount: Math.abs(entry.amount), date: dd }); }
          }
          if (entry.frequency === "once") break;
          dd = getNextOccurrence(dd, entry.frequency);
        }
      }
      for (const sub of filteredData.subscriptions) {
        if (!sub.includeInForecast) continue;
        let dd = sub.nextDate;
        while (dd <= me) {
          if (dd >= ms) { expense += sub.amount; expenseItems.push({ label: sub.name, amount: sub.amount, date: dd }); }
          if (sub.frequency === "once") break;
          dd = getNextOccurrence(dd, sub.frequency);
        }
      }

      months.push({ month: format(d, "MMM"), monthKey: format(d, "yyyy-MM"), income, expense, incomeItems, expenseItems });
    }
    return months;
  }, [filteredData, today]);

  const expandedData = useMemo(() => {
    if (!expandedMonth || !expandedType) return null;
    const m = incomeExpenseBarData.find(d => d.monthKey === expandedMonth);
    if (!m) return null;
    return expandedType === "income" ? m.incomeItems : m.expenseItems;
  }, [expandedMonth, expandedType, incomeExpenseBarData]);

  // Investments detailed data
  const [selectedInvestment, setSelectedInvestment] = useState<string>("all");
  const investmentDetails = useMemo(() => {
    const investments = filteredData.investments || [];
    if (investments.length === 0) return null;

    const targets = selectedInvestment === "all" ? investments : investments.filter(i => i.id === selectedInvestment);

    let totalInvested = 0, totalProfit = 0;
    let nextUpcoming: { date: string; amount: number } | null = null;
    let nextMaturity: { date: string; value: number; name: string } | null = null;

    targets.forEach(inv => {
      const vals = computeInvestmentValue(inv, today);
      totalInvested += vals.totalInvested;
      totalProfit += vals.profit;

      // Find next upcoming installment (after positionDate)
      let d = inv.startDate;
      while (d <= inv.endDate) {
        if (d > today) {
          if (!nextUpcoming || d < nextUpcoming.date) {
            nextUpcoming = { date: d, amount: inv.amount };
          }
          break;
        }
        if (inv.frequency === "once") break;
        d = getNextOccurrence(d, inv.frequency);
      }

      // Maturity - check against positionDate
      const isMatured = inv.endDate <= today;
      if (!isMatured) {
        if (!nextMaturity || inv.endDate < nextMaturity.date) {
          nextMaturity = { date: inv.endDate, value: vals.maturityValue, name: inv.name };
        }
      }
    });

    return { totalInvested, totalProfit, nextUpcoming, nextMaturity, investments };
  }, [filteredData, selectedInvestment, today]);

  // Upcoming subscriptions with dates
  const upcomingSubscriptions = useMemo(() => {
    return filteredData.subscriptions
      .filter(s => s.includeInForecast)
      .map(s => ({ ...s, daysUntil: daysBetween(today, s.nextDate) }))
      .filter(s => s.daysUntil >= 0 && s.daysUntil <= 30)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [filteredData.subscriptions, today]);

  return (
    <div className="space-y-4">
      {/* Account Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", "cash", "bank", "creditCard"] as AccountFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setAccountFilter(filter)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              accountFilter === filter
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {FILTER_LABELS[filter]}
          </button>
        ))}
      </div>

      <AlertBanner subscriptions={filteredData.subscriptions} forecast={forecast} positionDate={today} />

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Balance" value={formatMoney(effectiveBalance)} icon="balance" variant="success" />
        <StatCard title={`Forecast ${formatDate(data.forecastDate)}`} value={formatMoney(forecastBalance)} icon="forecast" variant={forecastBalance < 0 ? "danger" : "default"} />
        <StatCard title="Monthly Subs" value={formatMoney(monthSubs)} icon="subscriptions" />
        <StatCard title="Risk Date" value={riskDate ? formatDate(riskDate) : "None 🎉"} icon="risk" variant={riskDate ? "danger" : "success"} />
      </div>

      {/* Forecast Chart */}
      <ForecastChart forecast={forecast} currentBalance={effectiveBalance} forecastDate={effectiveData.forecastDate} />

      {/* Upcoming Transactions (30 days) */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Upcoming (30 days)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming transactions.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((item, i) => (
                <TimelineRow key={i} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Income vs Expense Bar Chart - tap to expand */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Income vs Expense (6 months)</CardTitle>
          <p className="text-[10px] text-muted-foreground">Tap a bar to see details</p>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incomeExpenseBarData} onClick={(state) => {
              if (state?.activePayload?.[0]) {
                const monthKey = state.activePayload[0].payload.monthKey;
                // Determine which bar was clicked based on cursor position
                setExpandedMonth(prev => prev === monthKey && expandedType ? null : monthKey);
              }
            }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="income" name="Income" fill="hsl(var(--success))" radius={[3, 3, 0, 0]}
                onClick={(data) => { setExpandedMonth(data.monthKey); setExpandedType("income"); }} cursor="pointer" />
              <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]}
                onClick={(data) => { setExpandedMonth(data.monthKey); setExpandedType("expense"); }} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>

          {/* Expanded detail */}
          {expandedMonth && expandedType && expandedData && (
            <div className="mt-3 rounded-lg border border-border/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">
                  {expandedType === "income" ? "Income" : "Expenses"} — {format(parseISO(expandedMonth + "-01"), "MMM yyyy")}
                </p>
                <button onClick={() => { setExpandedMonth(null); setExpandedType(null); }}
                  className="text-muted-foreground hover:text-foreground">
                  <ChevronUp className="h-4 w-4" />
                </button>
              </div>
              {expandedData.length === 0 ? (
                <p className="text-xs text-muted-foreground">No items.</p>
              ) : (
                <div className="space-y-1.5">
                  {expandedData.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-muted-foreground truncate mr-2">{item.label} <span className="text-[10px]">({formatDate(item.date)})</span></span>
                      <span className={`font-semibold shrink-0 ${expandedType === "income" ? "text-success" : "text-destructive"}`}>
                        {formatMoney(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Investments Detail */}
      {investmentDetails && (
        <Card>
          <CardHeader className="px-4 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Investments</CardTitle>
              <Select value={selectedInvestment} onValueChange={setSelectedInvestment}>
                <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Investments</SelectItem>
                  {investmentDetails.investments.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Total Invested</p>
                <p className="text-sm font-bold text-foreground">{formatMoney(investmentDetails.totalInvested)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Profit Accrued</p>
                <p className="text-sm font-bold text-success">{formatMoney(investmentDetails.totalProfit)}</p>
              </div>
            </div>

            {investmentDetails.nextUpcoming && (
              <div className="mt-3 rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Next Installment</p>
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-bold text-foreground">{formatMoney(investmentDetails.nextUpcoming.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(investmentDetails.nextUpcoming.date)}</p>
                </div>
              </div>
            )}

            {investmentDetails.nextMaturity && (
              <div className="mt-2 rounded-lg border border-dashed border-primary/30 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  Maturity{selectedInvestment !== "all" ? "" : ` (${investmentDetails.nextMaturity.name})`}
                </p>
                <div className="flex justify-between items-baseline">
                  <p className="text-base font-bold text-primary">{formatMoney(investmentDetails.nextMaturity.value)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(investmentDetails.nextMaturity.date)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upcoming Subscriptions */}
      {upcomingSubscriptions.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Upcoming Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {upcomingSubscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{sub.name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatDate(sub.nextDate)} · {sub.daysUntil === 0 ? "Today" : `${sub.daysUntil}d`}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{sub.category}</Badge>
                    <p className="text-sm font-bold text-destructive">-{formatMoney(sub.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SpendingBreakdown data={filteredData} />
    </div>
  );
}

function TimelineRow({ item }: { item: ForecastItem }) {
  const typeColors = {
    income: "bg-success/10 text-success",
    expense: "bg-destructive/10 text-destructive",
    subscription: "bg-warning/10 text-warning",
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className={`text-[10px] shrink-0 px-1.5 ${typeColors[item.type]}`}>
          {item.type === "income" ? "inflow" : item.type}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <p className="text-[10px] text-muted-foreground">{formatDate(item.date)}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className={`text-sm font-bold ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
          {item.amount >= 0 ? "+" : ""}{formatMoney(item.amount)}
        </p>
        <p className={`text-[10px] ${item.balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          Bal: {formatMoney(item.balance)}
        </p>
      </div>
    </div>
  );
}
