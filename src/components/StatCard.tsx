import { DollarSign, TrendingUp, CreditCard, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/finance-utils";

interface StatCardProps {
  title: string;
  value: string;
  icon: "balance" | "forecast" | "subscriptions" | "risk";
  variant?: "default" | "success" | "warning" | "danger";
}

const iconMap = {
  balance: DollarSign,
  forecast: TrendingUp,
  subscriptions: CreditCard,
  risk: AlertTriangle,
};

const variantStyles = {
  default: "bg-card text-card-foreground border-border",
  success: "bg-card text-card-foreground border-l-4 border-l-success border-border",
  warning: "bg-card text-card-foreground border-l-4 border-l-warning border-border",
  danger: "bg-card text-card-foreground border-l-4 border-l-destructive border-border",
};

const iconBgStyles = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatCard({ title, value, icon, variant = "default" }: StatCardProps) {
  const Icon = iconMap[icon];
  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`rounded-xl p-3 ${iconBgStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground truncate">{title}</p>
          <p className="text-xl font-bold tracking-tight truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
