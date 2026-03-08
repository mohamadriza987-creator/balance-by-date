import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import type { ForecastItem } from "@/lib/finance-types";
import { formatDate, formatMoney } from "@/lib/finance-utils";

interface ForecastChartProps {
  forecast: ForecastItem[];
  currentBalance: number;
  forecastDate: string;
}

export function ForecastChart({ forecast, currentBalance, forecastDate }: ForecastChartProps) {
  const chartData = useMemo(() => {
    if (forecast.length === 0) return [];

    // Aggregate by date to avoid too many points
    const byDate = new Map<string, number>();
    for (const item of forecast) {
      byDate.set(item.date, item.balance);
    }

    const points = [{ date: "Today", balance: currentBalance, rawDate: "" }];
    for (const [date, balance] of byDate) {
      points.push({ date: formatDate(date), balance, rawDate: date });
    }

    // Limit to ~60 points for readability
    if (points.length > 60) {
      const step = Math.ceil(points.length / 60);
      return points.filter((_, i) => i === 0 || i === points.length - 1 || i % step === 0);
    }
    return points;
  }, [forecast, currentBalance]);

  if (chartData.length < 2) return null;

  const minBalance = Math.min(...chartData.map((d) => d.balance));
  const maxBalance = Math.max(...chartData.map((d) => d.balance));
  const hasNegative = minBalance < 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Balance Forecast</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(168, 70%, 38%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(168, 70%, 38%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "hsl(215, 14%, 46%)" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(214, 20%, 90%)" }}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "hsl(215, 14%, 46%)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              domain={[Math.min(minBalance * 1.1, 0), maxBalance * 1.1]}
            />
            <Tooltip
              formatter={(value: number) => [formatMoney(value), "Balance"]}
              contentStyle={{
                backgroundColor: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(214, 20%, 90%)",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
              }}
            />
            {hasNegative && <ReferenceLine y={0} stroke="hsl(0, 72%, 55%)" strokeDasharray="4 4" strokeWidth={1.5} />}
            <Area
              type="monotone"
              dataKey="balance"
              stroke="hsl(168, 70%, 38%)"
              strokeWidth={2}
              fill="url(#balanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
