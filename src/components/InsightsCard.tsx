import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import type { AppData, ForecastItem } from "@/lib/finance-types";
import {
  formatMoney, formatDate, getMonthSubscriptionTotal, toMonthlyAmount,
  daysBetween, getRiskDate, todayStr,
} from "@/lib/finance-utils";
import { getAccountInsights } from "@/lib/account-forecast";

interface InsightsCardProps {
  data: AppData;
  forecast: ForecastItem[];
}

export function InsightsCard({ data, forecast }: InsightsCardProps) {
  const insights = useMemo(() => {
    const items: string[] = [];
    const today = data.positionDate || todayStr();
    const fm = (n: number) => formatMoney(n, data.userProfile);

    // Monthly subscription total
    const monthSubs = getMonthSubscriptionTotal(data.subscriptions);
    if (monthSubs > 0) {
      items.push(`Your subscriptions total ${fm(monthSubs)} per month.`);
    }

    // Largest expense category
    const categoryTotals: Record<string, number> = {};
    for (const e of data.entries) {
      if (e.amount < 0 && e.includeInForecast) {
        const monthly = toMonthlyAmount(Math.abs(e.amount), e.frequency);
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + monthly;
      }
    }
    for (const s of data.subscriptions) {
      if (s.includeInForecast) {
        const monthly = toMonthlyAmount(s.amount, s.frequency);
        categoryTotals[s.category] = (categoryTotals[s.category] || 0) + monthly;
      }
    }
    const totalExpense = Object.values(categoryTotals).reduce((a, b) => a + b, 0);
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    if (topCategory && totalExpense > 0) {
      const pct = Math.round((topCategory[1] / totalExpense) * 100);
      if (pct >= 30) {
        items.push(`${topCategory[0]} is ${pct}% of your monthly outflow.`);
      }
    }

    // Safety horizon
    const riskDate = getRiskDate(forecast);
    if (!riskDate) {
      const horizonMonths = Math.round(daysBetween(today, data.forecastDate) / 30);
      if (horizonMonths > 0) {
        items.push(`You are safe from negative balance for the next ${horizonMonths} months.`);
      }
    } else {
      const daysUntil = daysBetween(today, riskDate);
      if (daysUntil > 0) {
        items.push(`Balance goes negative in ${daysUntil} days on ${formatDate(riskDate)}.`);
      }
    }

    // Next large inflow
    const nextInflow = data.entries
      .filter(e => e.amount > 0 && e.includeInForecast && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (nextInflow) {
      items.push(`Your next large inflow is ${nextInflow.label} on ${formatDate(nextInflow.date)}.`);
    }

    // Trial ending warnings
    for (const sub of data.subscriptions) {
      if (sub.isTrial && sub.trialEndDate) {
        const days = daysBetween(today, sub.trialEndDate);
        if (days >= 0 && days <= 7) {
          items.push(`${sub.name} trial ends in ${days} day${days !== 1 ? "s" : ""}.`);
        }
      }
    }

    // Account-level insights
    try {
      const accountInsights = getAccountInsights(data);
      items.push(...accountInsights.slice(0, 3));
    } catch {}

    // Goal-related insights
    const activeGoals = (data.goals || []).filter(g => g.status === "active");
    if (activeGoals.length > 0) {
      const totalGoalContributions = activeGoals.reduce((sum, g) => sum + g.monthlyAmount, 0);
      if (totalGoalContributions > 0) {
        items.push(`Your active goals require ${fm(totalGoalContributions)} monthly.`);
      }
      const purchaseGoals = activeGoals.filter(g => g.type === "purchase");
      if (purchaseGoals.length > 0) {
        const closest = purchaseGoals.sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0];
        const monthsLeft = Math.max(0, Math.round(daysBetween(today, closest.targetDate) / 30));
        if (monthsLeft <= 12) {
          items.push(`Your ${closest.name} goal matures in ${monthsLeft} month${monthsLeft !== 1 ? "s" : ""}.`);
        }
      }
    }

    // Other Assets note
    const otherAssetsValue = (data.otherAssets || []).reduce((sum, a) => sum + a.currentValue, 0);
    if (otherAssetsValue > 0) {
      items.push(`Other Assets (${fm(otherAssetsValue)}) are excluded from available balance.`);
    }

    // Optional subscriptions savings
    const optionalCats = ["Entertainment", "Shopping"];
    const optionalTotal = data.subscriptions
      .filter(s => s.includeInForecast && optionalCats.includes(s.category))
      .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.frequency), 0);
    if (optionalTotal > 50) {
      items.push(`Reducing optional subscriptions would save up to ${fm(optionalTotal)}/mo.`);
    }

    return items.slice(0, 8);
  }, [data, forecast]);

  if (insights.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-warning" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              💡 {insight}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
