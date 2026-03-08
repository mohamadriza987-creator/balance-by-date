import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import { AlertBanner } from "@/components/AlertBanner";
import { ForecastChart } from "@/components/ForecastChart";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import type { AppData, ForecastItem, AccountType } from "@/lib/finance-types";
import {
  computeForecast, computeInvestmentValue,
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

  const forecast = useMemo(() => computeForecast(filteredData), [filteredData]);
  const today = todayStr();
  const forecastBalance = getBalanceOnDate(forecast, filteredData.forecastDate, filteredData.currentBalance);
  const monthSubs = getMonthSubscriptionTotal(filteredData.subscriptions);
  const riskDate = getRiskDate(forecast);
  const upcoming = forecast.filter((f) => daysBetween(today, f.date) <= 30).slice(0, 10);

  // Month selector for pie chart
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    for (let i = -3; i <= 3; i++) {
      const d = i < 0 ? subMonths(new Date(), Math.abs(i)) : addMonths(new Date(), i);
      opts.push(format(d, "yyyy-MM"));
    }
    return opts;
  }, []);

  // Monthly income/expense pie data
  const monthlyPieData = useMemo(() => {
    const monthStart = startOfMonth(parseISO(selectedMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);
    const ms = format(monthStart, "yyyy-MM-dd");
    const me = format(monthEnd, "yyyy-MM-dd");

    let income = 0;
    let expense = 0;

    for (const entry of filteredData.entries) {
      if (!entry.includeInForecast) continue;
      let d = entry.date;
      while (d <= me) {
        if (d >= ms && d <= me) {
          if (entry.amount >= 0) income += entry.amount;
          else expense += Math.abs(entry.amount);
        }
        if (entry.frequency === "once") break;
        d = getNextOccurrence(d, entry.frequency);
      }
    }

    for (const sub of filteredData.subscriptions) {
      if (!sub.includeInForecast) continue;
      let d = sub.nextDate;
      while (d <= me) {
        if (d >= ms && d <= me) expense += sub.amount;
        if (sub.frequency === "once") break;
        d = getNextOccurrence(d, sub.frequency);
      }
    }

    return [
      { name: "Income", value: income, fill: "hsl(var(--success))" },
      { name: "Expense", value: expense, fill: "hsl(var(--destructive))" },
    ].filter(d => d.value > 0);
  }, [filteredData, selectedMonth]);

  // Income vs expense bar chart (last 6 months)
  const incomeExpenseBarData = useMemo(() => {
    const months: { month: string; income: number; expense: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const ms = format(startOfMonth(d), "yyyy-MM-dd");
      const me = format(endOfMonth(d), "yyyy-MM-dd");
      let income = 0, expense = 0;

      for (const entry of filteredData.entries) {
        if (!entry.includeInForecast) continue;
        let dd = entry.date;
        while (dd <= me) {
          if (dd >= ms) {
            if (entry.amount >= 0) income += entry.amount;
            else expense += Math.abs(entry.amount);
          }
          if (entry.frequency === "once") break;
          dd = getNextOccurrence(dd, entry.frequency);
        }
      }
      for (const sub of filteredData.subscriptions) {
        if (!sub.includeInForecast) continue;
        let dd = sub.nextDate;
        while (dd <= me) {
          if (dd >= ms) expense += sub.amount;
          if (sub.frequency === "once") break;
          dd = getNextOccurrence(dd, sub.frequency);
        }
      }

      months.push({ month: format(d, "MMM"), income, expense });
    }
    return months;
  }, [filteredData]);

  // Investments summary
  const investmentSummary = useMemo(() => {
    const investments = filteredData.investments || [];
    if (investments.length === 0) return null;

    let totalInvested = 0, totalProfit = 0, upcomingAmount = 0;
    investments.forEach(inv => {
      const vals = computeInvestmentValue(inv);
      totalInvested += vals.totalInvested;
      totalProfit += vals.profit;
      // Upcoming investment installments in next 30 days
      let d = inv.startDate;
      while (d <= inv.endDate) {
        if (d >= today && daysBetween(today, d) <= 30) upcomingAmount += inv.amount;
        if (inv.frequency === "once") break;
        d = getNextOccurrence(d, inv.frequency);
      }
    });

    return [
      { name: "Invested", value: totalInvested },
      { name: "Profit", value: totalProfit },
      { name: "Upcoming (30d)", value: upcomingAmount },
    ];
  }, [filteredData, today]);

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

      <AlertBanner subscriptions={filteredData.subscriptions} forecast={forecast} />

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Current Balance" value={formatMoney(filteredData.currentBalance)} icon="balance" variant="success" />
        <StatCard title={`Forecast ${formatDate(data.forecastDate)}`} value={formatMoney(forecastBalance)} icon="forecast" variant={forecastBalance < 0 ? "danger" : "default"} />
        <StatCard title="Monthly Subs" value={formatMoney(monthSubs)} icon="subscriptions" />
        <StatCard title="Risk Date" value={riskDate ? formatDate(riskDate) : "None 🎉"} icon="risk" variant={riskDate ? "danger" : "success"} />
      </div>

      {/* Forecast Chart */}
      <ForecastChart forecast={forecast} currentBalance={filteredData.currentBalance} forecastDate={filteredData.forecastDate} />

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

      {/* Monthly Income/Expense Pie Chart */}
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Income vs Expense</CardTitle>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m} value={m}>{format(parseISO(m + "-01"), "MMM yyyy")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          {monthlyPieData.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">No data for this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={monthlyPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={10}>
                  {monthlyPieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Income vs Expense Bar Chart */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Income vs Expense (6 months)</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={incomeExpenseBarData}>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={40} />
              <Tooltip formatter={(value: number) => formatMoney(value)} />
              <Bar dataKey="income" fill="hsl(var(--success))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="hsl(var(--destructive))" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Investments Summary */}
      {investmentSummary && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Investments</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {investmentSummary.map((item) => (
                <div key={item.name} className="text-center rounded-lg bg-muted/50 p-3">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{item.name}</p>
                  <p className="text-sm font-bold text-foreground">{formatMoney(item.value)}</p>
                </div>
              ))}
            </div>
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
