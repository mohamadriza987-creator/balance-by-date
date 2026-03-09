import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Banknote, Building2, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { AccountBalances, AccountType, AppData } from "@/lib/finance-types";
import { formatMoney, formatDate, todayStr, addDays } from "@/lib/finance-utils";
import { computeAccountForecasts, getSettings } from "@/lib/account-forecast";
import { ACCOUNT_LABELS } from "@/lib/constants";

interface AccountsTabProps {
  data: AppData;
  onUpdateAccountBalances: (balances: AccountBalances) => void;
}

const accounts = [
  { key: "cash" as const, label: "Cash", icon: Banknote, color: "text-success" },
  { key: "bank" as const, label: "Bank", icon: Building2, color: "text-info" },
  { key: "creditCard" as const, label: "Credit Card Limit", icon: CreditCard, color: "text-warning" },
];

export function AccountsTab({ data, onUpdateAccountBalances }: AccountsTabProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [expandedAccount, setExpandedAccount] = useState<AccountType | null>(null);
  const settings = getSettings(data);
  const [includeCCInBalance, setIncludeCCInBalance] = useState(settings.includeCreditCardInBalance);
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);

  const startEdit = (key: string, val: number) => {
    setEditingKey(key);
    setEditValue(String(val));
  };

  const commitEdit = (key: keyof AccountBalances) => {
    const newVal = parseFloat(editValue) || 0;
    onUpdateAccountBalances({ ...data.accountBalances, [key]: newVal });
    setEditingKey(null);
  };

  const totalBalance = includeCCInBalance
    ? data.accountBalances.cash + data.accountBalances.bank + data.accountBalances.creditCard
    : data.accountBalances.cash + data.accountBalances.bank;

  // Account drill-down: 2-month movements
  const { accountItems } = useMemo(() => computeAccountForecasts(data), [data]);
  const twoMonthsOut = addDays(data.positionDate || todayStr(), 60);

  const getMovements = (acct: AccountType) => {
    return (accountItems[acct] || []).filter(item => item.date <= twoMonthsOut).slice(0, 30);
  };

  return (
    <div className="space-y-4">
      {/* Current Balance with CC toggle */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-5 px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Balance</p>
          </div>
          <p className="text-3xl font-bold text-foreground">{fm(totalBalance)}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Switch
              checked={includeCCInBalance}
              onCheckedChange={setIncludeCCInBalance}
              className="scale-75"
            />
            <span className="text-[10px] text-muted-foreground">Include credit card</span>
          </div>
        </CardContent>
      </Card>

      {/* Account Cards with drill-down */}
      <div className="space-y-2">
        {accounts.filter(({ key }) => enabledAccounts.includes(key)).map(({ key, label, icon: Icon, color }) => {
          const movements = getMovements(key);
          const isExpanded = expandedAccount === key;

          return (
            <Collapsible key={key} open={isExpanded} onOpenChange={(open) => setExpandedAccount(open ? key : null)}>
              <Card className="border-border/50">
                <CardContent className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
                      <div className={`rounded-lg p-2 bg-muted/50 ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          Account
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </p>
                      </div>
                    </CollapsibleTrigger>
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
                        {fm(data.accountBalances[key])}
                      </button>
                    )}
                  </div>

                  {/* Expanded Drill-Down */}
                  <CollapsibleContent>
                    {movements.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-3 ml-12">No upcoming movements (next 2 months)</p>
                    ) : (
                      <div className="mt-3 ml-2 space-y-1 max-h-[250px] overflow-y-auto">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          Next 2 months · {movements.length} events
                        </p>
                        {movements.map((item, i) => (
                          <div key={i} className="flex items-center justify-between rounded border border-border/30 px-2.5 py-1.5">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium truncate">{item.label}</p>
                              <p className="text-[9px] text-muted-foreground">{formatDate(item.date)} · {item.type}</p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className={`text-[11px] font-bold ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
                                {item.amount >= 0 ? "+" : ""}{fm(item.amount)}
                              </p>
                              <p className={`text-[9px] ${item.runningBalance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                Bal: {fm(item.runningBalance)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CollapsibleContent>
                </CardContent>
              </Card>
            </Collapsible>
          );
        })}
      </div>
    </div>
  );
}
