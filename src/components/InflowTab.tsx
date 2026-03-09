import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { CategorySelect } from "@/components/CategorySelect";
import { FrequencySelect } from "@/components/FrequencySelect";
import { AccountSelect } from "@/components/AccountSelect";
import { ACCOUNT_LABELS } from "@/lib/constants";
import type { AppData, Entry, Frequency, AccountType } from "@/lib/finance-types";
import { todayStr, formatDate, formatMoney } from "@/lib/finance-utils";

interface InflowTabProps {
  entries: Entry[];
  data: AppData;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Entry, "id">>) => void;
  onAddDebtWithPlan: (parentEntry: Omit<Entry, "id">, plan: { splits: number; frequency: Frequency; startDate: string; direction: "received" | "given" }) => void;
}

export function InflowTab({ entries, data, onAddEntry, onToggle, onRemove, onUpdate, onAddDebtWithPlan }: InflowTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const incomeEntries = entries.filter((e) => e.amount >= 0);
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState<AccountType>("bank");

  // Debt repayment fields
  const [debtSplits, setDebtSplits] = useState("1");
  const [debtFrequency, setDebtFrequency] = useState<Frequency>("monthly");
  const [debtStartDate, setDebtStartDate] = useState(todayStr());
  const isDebt = category === "Debt";

  // Refs for Enter key navigation
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const isValid = useMemo(() => !!(name.trim() && amount && date && category.trim()), [name, amount, date, category]);

  const reset = () => {
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setCategory(""); setAccount("bank");
    setDebtSplits("1"); setDebtFrequency("monthly"); setDebtStartDate(todayStr());
    nameRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const entry: Omit<Entry, "id"> = {
      label: name, amount: Math.abs(parseFloat(amount)),
      date, frequency, category: category || "General", account, includeInForecast: true,
    };

    if (isDebt && parseInt(debtSplits) > 0) {
      onAddDebtWithPlan(entry, {
        splits: parseInt(debtSplits) || 1,
        frequency: debtFrequency,
        startDate: debtStartDate,
        direction: "received",
      });
    } else {
      onAddEntry(entry);
    }
    reset();
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextRef?: React.RefObject<HTMLInputElement | null>, fieldType?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current.focus();
      } else if (fieldType === "last" && isValid) {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-success/30">
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base text-success">+ Add Inflow</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label className="text-xs">Description *</Label>
              <Input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Salary" className="h-9" onKeyDown={(e) => handleKeyDown(e, amountRef)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount *</Label>
                <Input ref={amountRef} type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" onKeyDown={(e) => handleKeyDown(e, dateRef)} />
              </div>
              <div>
                <Label className="text-xs">Frequency *</Label>
                <FrequencySelect value={frequency} onChange={setFrequency} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date *</Label>
                <Input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" onKeyDown={(e) => handleKeyDown(e, undefined, "last")} />
              </div>
              <div>
                <Label className="text-xs">Category *</Label>
                <CategorySelect value={category} onChange={setCategory} type="income" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Account *</Label>
              <AccountSelect value={account} onChange={setAccount} enabledAccounts={data.userProfile?.enabledAccounts} t Planning */}
            {isDebt && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
                <p className="text-xs font-semibold text-orange-400">📋 Repayment Plan</p>
                <p className="text-[10px] text-muted-foreground">Plan how you'll repay this debt. Repayments will be added as outflow entries.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Number of Splits</Label>
                    <Input type="number" min="1" max="120" value={debtSplits} onChange={e => setDebtSplits(e.target.value)} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-xs">Repayment Frequency</Label>
                    <FrequencySelect value={debtFrequency} onChange={setDebtFrequency} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Repayment Start Date</Label>
                  <Input type="date" value={debtStartDate} onChange={e => setDebtStartDate(e.target.value)} className="h-9" />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full bg-success hover:bg-success/90 text-success-foreground" disabled={!isValid}>
              {isDebt ? "+ Add Debt Received" : "+ Add Inflow"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {incomeEntries.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">INFLOW ENTRIES ({incomeEntries.length})</p>
          {incomeEntries.map((entry) =>
            editingId === entry.id ? (
              <EditableRow key={entry.id} entry={entry} onSave={(updates) => { onUpdate(entry.id, updates); setEditingId(null); }} onCancel={() => setEditingId(null)} />
            ) : (
              <EntryRow key={entry.id} entry={entry} fm={fm} onToggle={onToggle} onRemove={onRemove} onEdit={() => setEditingId(entry.id)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, fm, onToggle, onRemove, onEdit }: { entry: Entry; fm: (n: number) => string; onToggle: (id: string) => void; onRemove: (id: string) => void; onEdit: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Switch checked={entry.includeInForecast} onCheckedChange={() => onToggle(entry.id)} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{entry.label}</p>
              {entry.debtLinkId && <Badge className="text-[9px] bg-orange-500/20 text-orange-400 border-orange-500/30">Debt</Badge>}
              {entry.isOptional && <Badge variant="outline" className="text-[9px]">Optional</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {fm(Math.abs(entry.amount))} / {entry.frequency} · {formatDate(entry.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="secondary" className="text-[10px]">{ACCOUNT_LABELS[entry.account] || "Bank"}</Badge>
          <Badge variant="outline" className="text-[10px]">{entry.category}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditableRow({ entry, onSave, onCancel }: { entry: Entry; onSave: (updates: Partial<Omit<Entry, "id">>) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(entry.amount));
  const [frequency, setFrequency] = useState<Frequency>(entry.frequency);
  const [date, setDate] = useState(entry.date);
  const [category, setCategory] = useState(entry.category);
  const [account, setAccount] = useState<AccountType>(entry.account || "bank");

  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-8" />
          <Input type="number" inputMode="decimal" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-8" />
          <CategorySelect value={category} onChange={setCategory} type="income" className="h-8" />
          <FrequencySelect value={frequency} onChange={setFrequency} className="h-8" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
          <AccountSelect vaenabledAccounts={data.userProfile?.enabledAccounts} />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button size="sm" onClick={() => onSave({ label, amount: parseFloat(amount) || 0, frequency, date, category, account })}><Check className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
