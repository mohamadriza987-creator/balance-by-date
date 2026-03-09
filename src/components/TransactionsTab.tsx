import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { AlertBanner } from "@/components/AlertBanner";
import { ForecastChart } from "@/components/ForecastChart";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { InsightsCard } from "@/components/InsightsCard";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChevronUp } from "lucide-react";
import type { AppData, ForecastItem, AccountType } from "@/lib/finance-types";
import {
  computeForecast, computeInvestmentValue, computeBalanceAtPosition,
  formatDate, formatMoney, getBalanceOnDate,
  getMonthSubscriptionTotal, getRiskDate, todayStr, daysBetween, toMonthlyAmount,
  getNextOccurrence,
} from "@/lib/finance-utils";
import { ACCOUNT_LABELS, TYPE_COLORS } from "@/lib/constants";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";

type AccountFilter = "all" | AccountType;

interface TransactionsTabProps {
  data: AppData;
  onUpdateEntry?: (id: string, updates: Partial<Omit<import("@/lib/finance-types").Entry, "id">>) => void;
  onRemoveEntry?: (id: string) => void;
}

const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(210, 70%, 50%)",
  "hsl(340, 70%, 50%)", "hsl(160, 70%, 40%)",
];

const FILTER_LABELS: Record<AccountFilter, string> = {
  all: "All", cash: "Cash", bank: "Bank", creditCard: "Credit Card Due"
};

export function TransactionsTab({ data, onUpdateEntry, onRemoveEntry }: TransactionsTabProps) {
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);

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
  const effectiveBalance = useMemo(() => computeBalanceAtPosition(filteredData), [filteredData]);
  const effectiveData = useMemo((): AppData => ({
    ...filteredData, currentBalance: effectiveBalance,
  }), [filteredData, effectiveBalance]);

  const forecast = useMemo(() => computeForecast(effectiveData), [effectiveData]);
  const forecastBalance = getBalanceOnDate(forecast, effectiveData.forecastDate, effectiveBalance);
  const monthSubs = getMonthSubscriptionTotal(effectiveData.subscriptions);
  const riskDate = getRiskDate(forecast);
  const upcoming = forecast.filter((f) => daysBetween(today, f.date) <= 30).slice(0, 10);

  const dateInsights = useMemo(() => {
    const nextInflow = forecast.find(f => f.amount > 0);
    const nextOutflow = forecast.find(f => f.amount < 0);
    return { nextInflow, nextOutflow };
  }, [forecast]);

  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<"income" | "expense" | null>(null);

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
        // Respect trial
        const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
        let dd = chargeStart;
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

  const [selectedInvestment, setSelectedInvestment] = useState<string>("all");
  const investmentDetails = useMemo(() => {
    const investments = filteredData.investments || [];
    if (investments.length === 0) return null;
    const targets = selectedInvestment === "all" ? investments : investments.filter(i => i.id === selectedInvestment);
    let totalInvested = 0, totalProfit = 0;
    let totalUpcomingAmount = 0;
    let earliestUpcomingDate: string | null = null;
    let totalMaturityValue = 0;
    let earliestMaturityDate: string | null = null;
    let maturityCount = 0;

    targets.forEach(inv => {
      const vals = computeInvestmentValue(inv, today);
      totalInvested += vals.totalInvested;
      totalProfit += vals.profit;
      let d = inv.startDate;
      while (d <= inv.endDate) {
        if (d > today) {
          totalUpcomingAmount += inv.amount;
          if (!earliestUpcomingDate || d < earliestUpcomingDate) earliestUpcomingDate = d;
          break;
        }
        if (inv.frequency === "once") break;
        d = getNextOccurrence(d, inv.frequency);
      }
      const isMatured = inv.endDate <= today;
      if (!isMatured) {
        totalMaturityValue += vals.maturityValue;
        maturityCount++;
        if (!earliestMaturityDate || inv.endDate < earliestMaturityDate) earliestMaturityDate = inv.endDate;
      }
    });

    return {
      totalInvested, totalProfit,
      nextUpcoming: earliestUpcomingDate ? { date: earliestUpcomingDate, amount: totalUpcomingAmount } : null,
      nextMaturity: earliestMaturityDate ? { date: earliestMaturityDate, value: totalMaturityValue, count: maturityCount } : null,
      investments,
    };
  }, [filteredData, selectedInvestment, today]);

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

      {/* Projected Balance */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-4 px-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Projected Balance on {formatDate(data.forecastDate)}</p>
          <p className={`text-3xl font-bold ${forecastBalance < 0 ? "text-destructive" : "text-foreground"}`}>
            {fm(forecastBalance)}
          </p>
          <div className="flex justify-center gap-4 mt-2">
            {dateInsights.nextInflow && (
              <div className="text-left">
                <p className="text-[9px] text-muted-foreground">Next Inflow</p>
                <p className="text-[10px] font-medium text-success">{dateInsights.nextInflow.label} · {formatDate(dateInsights.nextInflow.date)}</p>
              </div>
            )}
            {dateInsights.nextOutflow && (
              <div className="text-left">
                <p className="text-[9px] text-muted-foreground">Next Outflow</p>
                <p className="text-[10px] font-medium text-destructive">{dateInsights.nextOutflow.label} · {formatDate(dateInsights.nextOutflow.date)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Safe Until / Risk */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title={riskDate ? "Next Negative Date" : "Safe Until"}
          value={riskDate ? formatDate(riskDate) : "No negative balance forecast"}
          icon="risk"
          variant={riskDate ? "danger" : "success"}
        />
        <StatCard
          title="Monthly Subscriptions"
          value={fm(monthSubs)}
          icon="subscriptions"
        />
      </div>

      {/* Alerts (trial, cheque, debt, renewals) */}
      <AlertBanner subscriptions={filteredData.subscriptions} forecast={forecast} entries={filteredData.entries} positionDate={today} />

      {/* Upcoming 30 Days */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Upcoming (30 days)</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming transactions.</p>
          ) : (
            <div className="space-y-1.5">
              {upcoming.map((item, i) => (
                <TimelineRow key={i} item={item} fm={fm} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Forecast Chart */}
      <ForecastChart forecast={forecast} currentBalance={effectiveBalance} forecastDate={effectiveData.forecastDate} />

      {/* Upcoming Subscriptions */}
      {upcomingSubscriptions.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Upcoming Subscriptions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-2">
              {upcomingSubscriptions.map((sub) => {
                const urgency = sub.daysUntil <= 2 ? "critical" : sub.daysUntil <= 5 ? "upcoming" : "info";
                const urgencyColors = {
                  critical: "border-l-4 border-l-destructive",
                  upcoming: "border-l-4 border-l-warning",
                  info: "border-l-4 border-l-info",
                };
                return (
                  <div key={sub.id} className={`flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5 ${urgencyColors[urgency]}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{sub.name}</p>
                        {sub.isTrial && <Badge className="text-[9px] bg-warning/20 text-warning border-warning/30">Trial</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatDate(sub.nextDate)} · {sub.daysUntil === 0 ? "Today" : `${sub.daysUntil}d`}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{sub.category}</Badge>
                      <p className="text-sm font-bold text-destructive">-{fm(sub.amount)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spending Breakdown */}
      <SpendingBreakdown data={filteredData} />

      {/* Insights */}
      <InsightsCard data={filteredData} forecast={forecast} />

      {/* Income vs Expense Bar Chart */}
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
                setExpandedMonth(prev => prev === monthKey && expandedType ? null : monthKey);
              }
            }}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(value: number) => fm(value)} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="income" name="Income" fill="hsl(var(--success))" radius={[3, 3, 0, 0]}
                onClick={(data) => { setExpandedMonth(data.monthKey); setExpandedType("income"); }} cursor="pointer" />
              <Bar dataKey="expense" name="Expense" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]}
                onClick={(data) => { setExpandedMonth(data.monthKey); setExpandedType("expense"); }} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>

          {expandedMonth && expandedType && expandedData && (
            <div className="mt-3 rounded-lg border border-border/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">
                  {expandedType === "income" ? "Income" : "Expenses"} — {format(parseISO(expandedMonth + "-01"), "MMM yyyy")}
                </p>
                <button onClick={() => { setExpandedMonth(null); setExpandedType(null); }} className="text-muted-foreground hover:text-foreground">
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
                      <span className={`font-semibold shrink-0 ${expandedType === "income" ? "text-success" : "text-destructive"}`}>{fm(item.amount)}</span>
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
                <p className="text-sm font-bold text-foreground">{fm(investmentDetails.totalInvested)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Profit Accrued</p>
                <p className="text-sm font-bold text-success">{fm(investmentDetails.totalProfit)}</p>
              </div>
            </div>
            {investmentDetails.nextUpcoming && (
              <div className="mt-3 rounded-lg border border-border/50 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">Next Installment</p>
                <div className="flex justify-between items-baseline">
                  <p className="text-sm font-bold text-foreground">{fm(investmentDetails.nextUpcoming.amount)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(investmentDetails.nextUpcoming.date)}</p>
                </div>
              </div>
            )}
            {investmentDetails.nextMaturity && (
              <div className="mt-2 rounded-lg border border-dashed border-primary/30 p-3">
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  {selectedInvestment === "all" ? `Total Maturity (${investmentDetails.nextMaturity.count} funds)` : "Maturity"}
                </p>
                <div className="flex justify-between items-baseline">
                  <p className="text-base font-bold text-primary">{fm(investmentDetails.nextMaturity.value)}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(investmentDetails.nextMaturity.date)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TimelineRow({ item, fm }: { item: ForecastItem; fm: (n: number) => string }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 ${
      item.isCheque ? "border-l-4 border-l-amber-400" : item.isDebtLinked ? "border-l-4 border-l-orange-400" : ""
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <Badge variant="outline" className={`text-[9px] shrink-0 px-1.5 ${TYPE_COLORS[item.type] || ""}`}>
          {item.type === "income" ? "inflow" : item.type === "cc_bill" ? "CC Bill" : item.type}
        </Badge>
        <div className="min-w-0">
          <div className="flex items-center gap-1">
            <p className="text-xs font-medium truncate">{item.label}</p>
            {item.isCheque && <Badge className="text-[8px] bg-amber-500/20 text-amber-400 px-1">Cheque</Badge>}
            {item.isDebtLinked && <Badge className="text-[8px] bg-orange-500/20 text-orange-400 px-1">Debt</Badge>}
          </div>
          <p className="text-[10px] text-muted-foreground">{formatDate(item.date)}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <p className={`text-xs font-bold ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
          {item.amount >= 0 ? "+" : ""}{fm(item.amount)}
        </p>
        <p className={`text-[10px] ${item.balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          Bal: {fm(item.balance)}
        </p>
      </div>
    </div>
  );
}
