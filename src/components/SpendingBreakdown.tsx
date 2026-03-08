import { useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
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
  const [expanded, setExpanded] = useState(false);

  const breakdown = useMemo(() => {
    const categoryMap: Record<string, number> = {};
    for (const sub of data.subscriptions) {
      if (!sub.includeInForecast) continue;
      const monthly = toMonthlyAmount(sub.amount, sub.frequency);
      categoryMap[sub.category] = (categoryMap[sub.category] || 0) + monthly;
    }
    for (const entry of data.entries) {
      if (!entry.includeInForecast || entry.amount >= 0) continue;
      const monthly = toMonthlyAmount(Math.abs(entry.amount), entry.frequency);
      categoryMap[entry.category] = (categoryMap[entry.category] || 0) + monthly;
    }
    return Object.entries(categoryMap)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const total = breakdown.reduce((s, b) => s + b.value, 0);

  // Show top 4 + "Other" in compact mode
  const compactData = useMemo(() => {
    if (expanded || breakdown.length <= 5) return breakdown;
    const top4 = breakdown.slice(0, 4);
    const otherValue = breakdown.slice(4).reduce((sum, b) => sum + b.value, 0);
    if (otherValue > 0) top4.push({ name: "Other", value: Math.round(otherValue * 100) / 100 });
    return top4;
  }, [breakdown, expanded]);

  if (breakdown.length === 0) return null;


  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Monthly Spending</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex flex-col gap-4">
          <div className="w-full h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={compactData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {compactData.map((_, index) => (
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
                    fontSize: "0.75rem",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {compactData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-foreground">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{formatMoney(item.value)}</span>
                  <span className="text-muted-foreground w-10 text-right">{((item.value / total) * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-border font-bold">
              <span className="text-foreground">Total</span>
              <span className="text-foreground">{formatMoney(total)}/mo</span>
            </div>
            {breakdown.length > 5 && (
              <Button variant="ghost" size="sm" className="w-full text-xs mt-1" onClick={() => setExpanded(!expanded)}>
                {expanded ? <><ChevronUp className="h-3 w-3 mr-1" /> Show Less</> : <><ChevronDown className="h-3 w-3 mr-1" /> Show All ({breakdown.length})</>}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
