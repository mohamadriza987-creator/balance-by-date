import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { AlertBanner } from "@/components/AlertBanner";
import { ForecastChart } from "@/components/ForecastChart";
import { SpendingBreakdown } from "@/components/SpendingBreakdown";
import type { AppData, ForecastItem } from "@/lib/finance-types";
import {
  computeForecast,
  formatDate,
  formatMoney,
  getBalanceOnDate,
  getMonthSubscriptionTotal,
  getRiskDate,
  todayStr,
  daysBetween,
} from "@/lib/finance-utils";

interface TimelineTabProps {
  data: AppData;
}

export function TimelineTab({ data }: TimelineTabProps) {
  const forecast = useMemo(() => computeForecast(data), [data]);
  const today = todayStr();
  const forecastBalance = getBalanceOnDate(forecast, data.forecastDate, data.currentBalance);
  const monthSubs = getMonthSubscriptionTotal(data.subscriptions);
  const riskDate = getRiskDate(forecast);
  const upcoming = forecast.filter((f) => daysBetween(today, f.date) <= 30).slice(0, 10);

  return (
    <div className="space-y-4">
      <AlertBanner subscriptions={data.subscriptions} forecast={forecast} />

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Current Balance" value={formatMoney(data.currentBalance)} icon="balance" variant="success" />
        <StatCard title={`Forecast ${formatDate(data.forecastDate)}`} value={formatMoney(forecastBalance)} icon="forecast" variant={forecastBalance < 0 ? "danger" : "default"} />
        <StatCard title="Monthly Subs" value={formatMoney(monthSubs)} icon="subscriptions" />
        <StatCard title="Risk Date" value={riskDate ? formatDate(riskDate) : "None 🎉"} icon="risk" variant={riskDate ? "danger" : "success"} />
      </div>

      <ForecastChart forecast={forecast} currentBalance={data.currentBalance} forecastDate={data.forecastDate} />

      <SpendingBreakdown data={data} />

      {/* Upcoming Timeline */}
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

      {/* Full Forecast Table */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base">Full Forecast</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Date</th>
                <th className="pb-2 pr-2 font-medium">Description</th>
                <th className="pb-2 pr-2 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {forecast.slice(0, 100).map((item, i) => (
                <tr key={i} className={`border-b border-border/50 ${item.balance < 0 ? "bg-destructive/5" : ""}`}>
                  <td className="py-1.5 pr-2 text-muted-foreground whitespace-nowrap">{formatDate(item.date)}</td>
                  <td className="py-1.5 pr-2 truncate max-w-[100px]">{item.label}</td>
                  <td className={`py-1.5 pr-2 text-right font-medium whitespace-nowrap ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
                    {item.amount >= 0 ? "+" : ""}{formatMoney(item.amount)}
                  </td>
                  <td className={`py-1.5 text-right font-bold whitespace-nowrap ${item.balance < 0 ? "text-destructive" : ""}`}>
                    {formatMoney(item.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {forecast.length > 100 && (
            <p className="mt-2 text-xs text-muted-foreground">Showing first 100 of {forecast.length} entries</p>
          )}
        </CardContent>
      </Card>
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
          {item.type}
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
