import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, AlertTriangle, CheckCircle, XCircle, Plus, Trash2 } from "lucide-react";
import { AccountSelect } from "@/components/AccountSelect";
import type { AppData, AccountType, Transfer } from "@/lib/finance-types";
import { formatMoney, formatDate, todayStr } from "@/lib/finance-utils";
import {
  computeAccountForecasts, generateTransferSuggestions, computeCreditCardBills, getSettings,
} from "@/lib/account-forecast";
import { ACCOUNT_LABELS } from "@/lib/constants";

interface TransfersTabProps {
  data: AppData;
  onAddTransfer: (transfer: Omit<Transfer, "id">) => void;
  onRemoveTransfer: (id: string) => void;
}

const feasibilityColors = {
  feasible: "text-success bg-success/10 border-success/20",
  risky: "text-warning bg-warning/10 border-warning/20",
  not_feasible: "text-destructive bg-destructive/10 border-destructive/20",
};
const feasibilityIcons = {
  feasible: <CheckCircle className="h-4 w-4" />,
  risky: <AlertTriangle className="h-4 w-4" />,
  not_feasible: <XCircle className="h-4 w-4" />,
};
const feasibilityLabels = {
  feasible: "Feasible", risky: "Risky", not_feasible: "Not Feasible",
};

export function TransfersTab({ data, onAddTransfer, onRemoveTransfer }: TransfersTabProps) {
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);

  const { shortfalls } = useMemo(() => computeAccountForecasts(data), [data]);
  const suggestions = useMemo(() => generateTransferSuggestions(data), [data]);
  const ccBills = useMemo(() => computeCreditCardBills(data), [data]);
  const appliedTransfers = (data.transfers || []).filter(t => t.isApplied);

  // Manual transfer form
  const [fromAccount, setFromAccount] = useState<AccountType>("bank");
  const [toAccount, setToAccount] = useState<AccountType>("cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState("");

  const handleAddManual = () => {
    if (!amount || parseFloat(amount) <= 0 || fromAccount === toAccount) return;
    onAddTransfer({
      fromAccount, toAccount, amount: parseFloat(amount), date,
      reason: reason || `Manual: ${ACCOUNT_LABELS[fromAccount]} → ${ACCOUNT_LABELS[toAccount]}`,
      isApplied: true,
    });
    setAmount(""); setReason("");
  };

  const handleApplySuggestion = (sg: typeof suggestions[0]) => {
    onAddTransfer({
      fromAccount: sg.fromAccount, toAccount: sg.toAccount,
      amount: sg.amount, date: sg.suggestedDate,
      reason: sg.reason, isApplied: true,
    });
  };

  return (
    <div className="space-y-4">
      {/* Upcoming Shortfalls */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Account Shortfalls
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Upcoming cases where an account cannot cover a payment</p>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {shortfalls.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" /> All accounts are sufficiently funded
            </div>
          ) : (
            <div className="space-y-2">
              {shortfalls.slice(0, 8).map((sf, i) => (
                <div key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium">{sf.itemLabel}</p>
                    <Badge variant="outline" className="text-[9px]">{ACCOUNT_LABELS[sf.account]}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(sf.date)}</p>
                  <div className="flex gap-3 mt-1 text-[10px]">
                    <span>Need: <span className="font-semibold text-destructive">{fm(sf.requiredAmount)}</span></span>
                    <span>Have: <span className="font-semibold">{fm(sf.availableAmount)}</span></span>
                    <span>Short: <span className="font-semibold text-destructive">{fm(sf.shortageAmount)}</span></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Transfers */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Suggested Transfers</CardTitle>
            <p className="text-[10px] text-muted-foreground">Auto-recommended to resolve shortfalls</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {suggestions.map((sg, i) => (
              <div key={i} className={`rounded-lg border px-3 py-2.5 ${feasibilityColors[sg.feasibility]}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {feasibilityIcons[sg.feasibility]}
                    <span className="text-xs font-semibold">{feasibilityLabels[sg.feasibility]}</span>
                  </div>
                  {sg.feasibility !== "not_feasible" && (
                    <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={() => handleApplySuggestion(sg)}>
                      Apply
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Badge variant="secondary" className="text-[9px]">{ACCOUNT_LABELS[sg.fromAccount]}</Badge>
                  <ArrowRight className="h-3 w-3" />
                  <Badge variant="secondary" className="text-[9px]">{ACCOUNT_LABELS[sg.toAccount]}</Badge>
                  <span className="font-bold ml-1">{fm(sg.amount)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{formatDate(sg.suggestedDate)} · {sg.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CC Bills */}
      {ccBills.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Upcoming CC Bill Payments</CardTitle>
            <p className="text-[10px] text-muted-foreground">Auto-settled from Bank on bill date</p>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {ccBills.map((bill, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="text-xs font-medium">{bill.label}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDate(bill.date)}</p>
                </div>
                <p className="text-sm font-bold text-destructive">{fm(bill.amount)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Applied Transfers */}
      {appliedTransfers.length > 0 && (
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-base">Applied Transfers</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            {appliedTransfers.map((tr) => (
              <div key={tr.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Badge variant="secondary" className="text-[9px]">{ACCOUNT_LABELS[tr.fromAccount]}</Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="secondary" className="text-[9px]">{ACCOUNT_LABELS[tr.toAccount]}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(tr.date)} · {tr.reason}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold">{fm(tr.amount)}</p>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemoveTransfer(tr.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Manual Transfer */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" /> Add Manual Transfer
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">From</Label>
              <AccountSelect value={fromAccount} onChange={setFromAccount} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <AccountSelect value={toAccount} onChange={setToAccount} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount</Label>
              <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Reason (optional)</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Cover rent from savings" className="h-9" />
          </div>
          <Button className="w-full" variant="outline" onClick={handleAddManual} disabled={!amount || parseFloat(amount) <= 0 || fromAccount === toAccount}>
            Add Transfer
          </Button>
          {fromAccount === toAccount && amount && (
            <p className="text-[10px] text-destructive">Source and destination must be different</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
