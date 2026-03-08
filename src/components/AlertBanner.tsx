import { AlertTriangle, Clock, CreditCard, FileText, Scale } from "lucide-react";
import type { Entry, Subscription } from "@/lib/finance-types";
import type { ForecastItem } from "@/lib/finance-types";
import { daysBetween, formatDate, todayStr } from "@/lib/finance-utils";

interface AlertBannerProps {
  subscriptions: Subscription[];
  forecast: ForecastItem[];
  entries?: Entry[];
  positionDate?: string;
}

export function AlertBanner({ subscriptions, forecast, entries, positionDate }: AlertBannerProps) {
  const today = positionDate || todayStr();
  const alerts: { icon: React.ReactNode; message: string; type: "warning" | "danger" | "info" | "star" }[] = [];

  // ★ Trials ending soon (starred/highlighted)
  for (const sub of subscriptions) {
    if (sub.isTrial && sub.trialEndDate) {
      const days = daysBetween(today, sub.trialEndDate);
      if (days >= 0 && days <= 7) {
        alerts.push({
          icon: <Clock className="h-4 w-4 shrink-0" />,
          message: `⭐ Trial ending soon: ${sub.name} — Cancel before charge starts (${days === 0 ? "today" : `in ${days}d`})`,
          type: "star",
        });
      }
    }
  }

  // ★ Cheque items (starred/highlighted)
  if (entries) {
    for (const entry of entries) {
      if (entry.isCheque && entry.includeInForecast) {
        const days = daysBetween(today, entry.date);
        if (days >= 0 && days <= 30) {
          alerts.push({
            icon: <FileText className="h-4 w-4 shrink-0" />,
            message: `⭐ Cheque due: ${entry.label} — ${days === 0 ? "today" : `in ${days}d`}`,
            type: "star",
          });
        }
      }
    }
  }

  // Debt-related alerts
  if (entries) {
    for (const entry of entries) {
      if (entry.debtLinkId && entry.includeInForecast) {
        const days = daysBetween(today, entry.date);
        if (days >= 0 && days <= 14) {
          alerts.push({
            icon: <Scale className="h-4 w-4 shrink-0" />,
            message: `${entry.debtType === "repayment" ? "Repayment" : "Recovery"} due: ${entry.label} — ${days === 0 ? "today" : `in ${days}d`}`,
            type: "warning",
          });
        }
      }
    }
  }

  // Renewals within 7 days
  for (const sub of subscriptions) {
    if (sub.includeInForecast) {
      const days = daysBetween(today, sub.nextDate);
      if (days >= 0 && days <= 7 && !(sub.isTrial && sub.trialEndDate)) {
        alerts.push({
          icon: <CreditCard className="h-4 w-4 shrink-0" />,
          message: `${sub.name} renews ${days === 0 ? "today" : `in ${days} day${days > 1 ? "s" : ""}`}`,
          type: "info",
        });
      }
    }
  }

  // First negative balance
  const negItem = forecast.find((f) => f.balance < 0);
  if (negItem) {
    alerts.push({
      icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
      message: `Balance goes negative on ${formatDate(negItem.date)}`,
      type: "danger",
    });
  }

  if (alerts.length === 0) return null;

  const colorMap = {
    star: "bg-amber-500/10 text-amber-400 border-amber-500/20 border-l-4 border-l-amber-400",
    warning: "bg-warning/10 text-warning border-warning/20",
    danger: "bg-destructive/10 text-destructive border-destructive/20",
    info: "bg-info/10 text-info border-info/20",
  };

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((a, i) => (
        <div key={i} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium ${colorMap[a.type]}`}>
          {a.icon}
          {a.message}
        </div>
      ))}
    </div>
  );
}
