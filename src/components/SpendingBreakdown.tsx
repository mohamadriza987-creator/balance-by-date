import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppData } from "@/lib/finance-types";
import { formatMoney, toMonthlyAmount } from "@/lib/finance-utils";

const COLORS = [
  "hsl(0, 72%, 55%)",
  "hsl(38, 92%, 50%)",
  "hsl(210, 80%, 52%)",
  "hsl(168, 70%, 38%)",
  "hsl(280, 60%, 55%)",
  "hsl(330, 65%, 50%)",
  "hsl(15, 75%, 55%)",
  "hsl(195, 70%, 45%)",
];

interface SpendingBreakdownProps {
  data: AppData;
}

export function SpendingBreakdown({ data }: SpendingBreakdownProps) {
  const breakdown = useMemo(() => {
    const categoryMap: Record<string, number> = {};

    // Aggregate monthly spending from subscriptions
    for (const sub of data.subscriptions) {
      if (!sub.includeInForecast) continue;
      let monthly = sub.amount;
      if (sub.frequency === "weekly") monthly = sub.amount * 4.33;
      else if (sub.frequency === "yearly") monthly = sub.amount / 12;
      categoryMap[sub.category] = (categoryMap[sub.category] || 0) + monthly;
    }

    // Aggregate monthly spending from expense entries
    for (const entry of data.entries) {
      if (!entry.includeInForecast || entry.amount >= 0) continue;
      const absAmount = Math.abs(entry.amount);
      let monthly = absAmount;
      if (entry.frequency === "weekly") monthly = absAmount * 4.33;
      else if (entry.frequency === "yearly") monthly = absAmount / 12;
      else if (entry.frequency === "once") monthly = absAmount; // show as-is
      categoryMap[entry.category] = (categoryMap[entry.category] || 0) + monthly;
    }

    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = breakdown.reduce((s, b) => s + b.value, 0);

  if (breakdown.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Monthly Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-full lg:w-1/2 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {breakdown.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatMoney(value)}
                  contentStyle={{
                    borderRadius: "0.5rem",
                    border: "1px solid hsl(var(--border))",
                    background: "hsl(var(--card))",
                    color: "hsl(var(--card-foreground))",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full lg:w-1/2 space-y-2">
            {breakdown.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-foreground">{formatMoney(item.value)}</span>
                  <span className="text-muted-foreground w-12 text-right">
                    {((item.value / total) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">{formatMoney(total)}/mo</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
