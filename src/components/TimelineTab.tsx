import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { AlertBanner } from "@/components/AlertBanner";
import { ForecastChart } from "@/components/ForecastChart";
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
    <div className="space-y-6">
      <AlertBanner subscriptions={data.subscriptions} forecast={forecast} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Current Balance" value={formatMoney(data.currentBalance)} icon="balance" variant="success" />
        <StatCard title={`Forecast ${formatDate(data.forecastDate)}`} value={formatMoney(forecastBalance)} icon="forecast" variant={forecastBalance < 0 ? "danger" : "default"} />
        <StatCard title="Monthly Subscriptions" value={formatMoney(monthSubs)} icon="subscriptions" />
        <StatCard title="Risk Date" value={riskDate ? formatDate(riskDate) : "None 🎉"} icon="risk" variant={riskDate ? "danger" : "success"} />
      </div>

      <ForecastChart forecast={forecast} currentBalance={data.currentBalance} forecastDate={data.forecastDate} />

      {/* Upcoming Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upcoming (30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground text-sm">No upcoming transactions.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((item, i) => (
                <TimelineRow key={i} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Forecast Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Full Forecast</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 pr-4 font-medium">Description</th>
                <th className="pb-2 pr-4 font-medium text-right">Amount</th>
                <th className="pb-2 font-medium text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {forecast.slice(0, 100).map((item, i) => (
                <tr key={i} className={`border-b border-border/50 ${item.balance < 0 ? "bg-destructive/5" : ""}`}>
                  <td className="py-2 pr-4 text-muted-foreground">{formatDate(item.date)}</td>
                  <td className="py-2 pr-4">{item.label}</td>
                  <td className={`py-2 pr-4 text-right font-medium ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
                    {item.amount >= 0 ? "+" : ""}{formatMoney(item.amount)}
                  </td>
                  <td className={`py-2 text-right font-bold ${item.balance < 0 ? "text-destructive" : ""}`}>
                    {formatMoney(item.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {forecast.length > 100 && (
            <p className="mt-3 text-xs text-muted-foreground">Showing first 100 of {forecast.length} entries</p>
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
    <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <Badge variant="outline" className={`text-xs shrink-0 ${typeColors[item.type]}`}>
          {item.type}
        </Badge>
        <div className="min-w-0">
          <p className="font-medium truncate">{item.label}</p>
          <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
        </div>
      </div>
      <div className="text-right shrink-0 ml-4">
        <p className={`font-bold ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
          {item.amount >= 0 ? "+" : ""}{formatMoney(item.amount)}
        </p>
        <p className={`text-xs ${item.balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          Bal: {formatMoney(item.balance)}
        </p>
      </div>
    </div>
  );
}
