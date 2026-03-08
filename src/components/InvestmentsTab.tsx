import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Investment } from "@/lib/finance-types";
import { formatMoney, formatDate, computeInvestmentValue } from "@/lib/finance-utils";

interface InvestmentsTabProps {
  investments: Investment[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Investment, "id">>) => void;
}

const freqLabel: Record<string, string> = {
  once: "One-time", weekly: "Weekly", biweekly: "Bi-weekly",
  monthly: "Monthly", quarterly: "Quarterly", halfyearly: "Half-yearly", yearly: "Yearly",
};
const COLORS = [
  "hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(210, 70%, 50%)",
  "hsl(340, 70%, 50%)", "hsl(160, 70%, 40%)",
];

function AllocationChart({ investments }: { investments: Investment[] }) {
  const data = useMemo(() => {
    const byCategory: Record<string, number> = {};
    investments.forEach((inv) => {
      const vals = computeInvestmentValue(inv);
      byCategory[inv.category] = (byCategory[inv.category] || 0) + vals.currentValue;
    });
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }));
  }, [investments]);

  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Allocation</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
              paddingAngle={3} dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              fontSize={10}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatMoney(value)} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function InvestmentsTab({ investments, onRemove }: InvestmentsTabProps) {
  if (investments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No investments yet. Add one from the "Add" tab.</p>
        </CardContent>
      </Card>
    );
  }

  const totals = investments.reduce(
    (acc, inv) => {
      const vals = computeInvestmentValue(inv);
      acc.invested += vals.totalInvested;
      acc.profit += vals.profit;
      acc.value += vals.currentValue;
      return acc;
    },
    { invested: 0, profit: 0, value: 0 }
  );

  return (
    <div className="space-y-3">
      {/* Portfolio Summary */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-4 px-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Invested</p>
              <p className="text-sm font-bold text-foreground">{formatMoney(totals.invested)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Profit</p>
              <p className="text-sm font-bold text-success">{formatMoney(totals.profit)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Portfolio</p>
              <p className="text-sm font-bold text-primary">{formatMoney(totals.value)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AllocationChart investments={investments} />

      {investments.map((inv) => {
        const vals = computeInvestmentValue(inv);
        const isMatured = new Date(inv.endDate) <= new Date();

        return (
          <Card key={inv.id}>
            <CardHeader className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <CardTitle className="text-sm truncate">{inv.name}</CardTitle>
                  <Badge variant="outline" className="text-[10px] shrink-0">{inv.category}</Badge>
                  <Badge variant={isMatured ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {isMatured ? "Matured" : "Active"}
                  </Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onRemove(inv.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                <div>
                  <p className="text-muted-foreground">Installment</p>
                  <p className="font-semibold">{formatMoney(inv.amount)} / {freqLabel[inv.frequency] || inv.frequency}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Start</p>
                  <p className="font-semibold">{formatDate(inv.startDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">End</p>
                  <p className="font-semibold">{formatDate(inv.endDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Return</p>
                  <p className="font-semibold">{inv.expectedReturn}% / yr</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-3">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Invested</p>
                  <p className="text-sm font-bold text-foreground">{formatMoney(vals.totalInvested)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Profit</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatMoney(vals.profit)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Value</p>
                  <p className="text-sm font-bold text-primary">{formatMoney(vals.currentValue)}</p>
                </div>
              </div>

              {!isMatured && (
                <div className="mt-2 rounded-lg border border-dashed border-border p-2.5 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Maturity ({formatDate(inv.endDate)})</p>
                  <p className="text-base font-bold text-primary">{formatMoney(vals.maturityValue)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Inv: {formatMoney(vals.totalInvestedFull)} · Profit: {formatMoney(vals.maturityProfit)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
