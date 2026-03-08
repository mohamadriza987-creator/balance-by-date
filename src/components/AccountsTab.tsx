import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Banknote, Building2, CreditCard } from "lucide-react";
import type { AccountBalances, AppData } from "@/lib/finance-types";
import { formatMoney } from "@/lib/finance-utils";

interface AccountsTabProps {
  data: AppData;
  onUpdateAccountBalances: (balances: AccountBalances) => void;
}

const accounts = [
  { key: "cash" as const, label: "Cash", icon: Banknote, color: "text-success" },
  { key: "bank" as const, label: "Bank", icon: Building2, color: "text-info" },
  { key: "creditCard" as const, label: "Card Outstanding", icon: CreditCard, color: "text-warning" },
];

export function AccountsTab({ data, onUpdateAccountBalances }: AccountsTabProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (key: string, val: number) => {
    setEditingKey(key);
    setEditValue(String(val));
  };

  const commitEdit = (key: keyof AccountBalances) => {
    const newVal = parseFloat(editValue) || 0;
    onUpdateAccountBalances({ ...data.accountBalances, [key]: newVal });
    setEditingKey(null);
  };

  const totalBalance = data.accountBalances.cash + data.accountBalances.bank + data.accountBalances.creditCard;

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-5 px-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Current Balance</p>
          <p className="text-3xl font-bold text-foreground">{formatMoney(totalBalance)}</p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {accounts.map(({ key, label, icon: Icon, color }) => (
          <Card key={key} className="border-border/50">
            <CardContent className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 bg-muted/50 ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Account</p>
                </div>
              </div>
              {editingKey === key ? (
                <Input
                  type="number" step="0.01" className="w-28 h-8 text-sm text-right"
                  value={editValue} onChange={(e) => setEditValue(e.target.value)}
                  onBlur={() => commitEdit(key)}
                  onKeyDown={(e) => { if (e.key === "Enter") commitEdit(key); }}
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => startEdit(key, data.accountBalances[key])}
                  className="text-lg font-bold text-foreground hover:text-primary transition-colors"
                >
                  {formatMoney(data.accountBalances[key])}
                </button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
