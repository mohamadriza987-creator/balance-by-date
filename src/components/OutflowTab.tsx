import { useState, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { CategorySelect } from "@/components/CategorySelect";
import { FrequencySelect } from "@/components/FrequencySelect";
import { AccountSelect } from "@/components/AccountSelect";
import { ACCOUNT_LABELS } from "@/lib/constants";
import type { AppData, Entry, Frequency, Investment, Subscription, AccountType } from "@/lib/finance-types";
import { todayStr, formatDate, formatMoney, computeInvestmentValue } from "@/lib/finance-utils";

type OutflowMode = "expense" | "subscription" | "investment";

interface OutflowTabProps {
  entries: Entry[];
  subscriptions: Subscription[];
  investments: Investment[];
  data: AppData;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onAddSubscription: (sub: Omit<Subscription, "id">) => void;
  onAddInvestment: (inv: Omit<Investment, "id">) => void;
  onRemoveEntry: (id: string) => void;
  onRemoveSubscription: (id: string) => void;
  onRemoveInvestment: (id: string) => void;
  onToggleEntry: (id: string) => void;
  onToggleSubscription: (id: string) => void;
  onUpdateEntry: (id: string, updates: Partial<Omit<Entry, "id">>) => void;
  onUpdateSubscription: (id: string, updates: Partial<Omit<Subscription, "id">>) => void;
  onUpdateInvestment: (id: string, updates: Partial<Omit<Investment, "id">>) => void;
  onAddDebtWithPlan: (parentEntry: Omit<Entry, "id">, plan: { splits: number; frequency: Frequency; startDate: string; direction: "received" | "given" }) => void;
}

export function OutflowTab({
  entries, subscriptions, investments, data,
  onAddEntry, onAddSubscription, onAddInvestment,
  onRemoveEntry, onRemoveSubscription, onRemoveInvestment,
  onToggleEntry, onToggleSubscription,
  onUpdateEntry, onUpdateSubscription, onUpdateInvestment,
  onAddDebtWithPlan,
}: OutflowTabProps) {
  const [mode, setMode] = useState<OutflowMode>("expense");
  const expenseEntries = entries.filter(e => e.amount < 0);
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);

  return (
    <div className="space-y-4">
      <Card className="border-destructive/30">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-destructive">— Add Outflow</CardTitle>
            <Select value={mode} onValueChange={(v) => setMode(v as OutflowMode)}>
              <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="investment">Investment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {mode === "expense" && <ExpenseForm onAdd={onAddEntry} onAddDebtWithPlan={onAddDebtWithPlan} enabledAccounts={profile?.enabledAccounts} />}
          {mode === "subscription" && <SubscriptionForm onAdd={onAddSubscription} enabledAccounts={profile?.enabledAccounts} />}
          {mode === "investment" && <InvestmentForm onAdd={onAddInvestment} enabledAccounts={profile?.enabledAccounts} />}
        </CardContent>
      </Card>

      {mode === "expense" && <ExpenseList entries={expenseEntries} fm={fm} onToggle={onToggleEntry} onRemove={onRemoveEntry} onUpdate={onUpdateEntry} />}
      {mode === "subscription" && <SubscriptionList subscriptions={subscriptions} fm={fm} onToggle={onToggleSubscription} onRemove={onRemoveSubscription} onUpdate={onUpdateSubscription} />}
      {mode === "investment" && <InvestmentList investments={investments} fm={fm} onRemove={onRemoveInvestment} onUpdate={onUpdateInvestment} />}
    </div>
  );
}

// ============ EXPENSE FORM ============
function ExpenseForm({ onAdd, onAddDebtWithPlan, enabledAccounts }: {
  onAdd: (e: Omit<Entry, "id">) => string;
  onAddDebtWithPlan: (parentEntry: Omit<Entry, "id">, plan: { splits: number; frequency: Frequency; startDate: string; direction: "received" | "given" }) => void;
  enabledAccounts?: AccountType[];
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState<AccountType>("bank");
  const [isCheque, setIsCheque] = useState(false);

  // Debt recovery fields
  const [debtSplits, setDebtSplits] = useState("1");
  const [debtFrequency, setDebtFrequency] = useState<Frequency>("monthly");
  const [debtStartDate, setDebtStartDate] = useState(todayStr());
  const isDebt = category === "Debt";

  // Refs for Enter key navigation
  const nameRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const isValid = !!(name.trim() && amount && date && category.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const entry: Omit<Entry, "id"> = {
      label: name, amount: -Math.abs(parseFloat(amount)), date, frequency, category, account,
      includeInForecast: true, isCheque: (account === "bank" && isCheque) || undefined,
    };

    if (isDebt && parseInt(debtSplits) > 0) {
      onAddDebtWithPlan(entry, {
        splits: parseInt(debtSplits) || 1,
        frequency: debtFrequency,
        startDate: debtStartDate,
        direction: "given",
      });
    } else {
      onAdd(entry);
    }
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setCategory(""); setAccount("bank"); setIsCheque(false);
    setDebtSplits("1"); setDebtFrequency("monthly"); setDebtStartDate(todayStr());
    nameRef.current?.focus();
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
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs">Description *</Label>
        <Input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Groceries" className="h-9" onKeyDown={(e) => handleKeyDown(e, amountRef)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input ref={amountRef} type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" onKeyDown={(e) => handleKeyDown(e, dateRef)} /></div>
        <div><Label className="text-xs">Frequency *</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Date *</Label>
          <Input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" onKeyDown={(e) => handleKeyDown(e, undefined, "last")} /></div>
        <div><Label className="text-xs">Category *</Label>
          <CategorySelect value={category} onChange={setCategory} type="expense" /></div>
      </div>
      <div>
        <Label className="text-xs">Account *</Label>
        <AccountSelect value={account} onChange={setAccount} enabledAccounts={data.userProfile?.enabledAccounts} />
      </div>

      {/* Cheque toggle for bank payments */}
      {account === "bank" && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <Checkbox id="cheque-toggle" checked={isCheque} onCheckedChange={(v) => setIsCheque(!!v)} />
          <Label htmlFor="cheque-toggle" className="text-xs cursor-pointer text-amber-400">Mark as Cheque payment</Label>
        </div>
      )}

      {/* Debt Recovery Planning */}
      {isDebt && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
          <p className="text-xs font-semibold text-orange-400">📋 Recovery Plan</p>
          <p className="text-[10px] text-muted-foreground">Plan expected recovery dates. Inflow entries will be auto-generated.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Number of Splits</Label>
              <Input type="number" min="1" max="120" value={debtSplits} onChange={e => setDebtSplits(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Recovery Frequency</Label>
              <FrequencySelect value={debtFrequency} onChange={setDebtFrequency} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Recovery Start Date</Label>
            <Input type="date" value={debtStartDate} onChange={e => setDebtStartDate(e.target.value)} className="h-9" />
          </div>
        </div>
      )}

      <Button type="submit" variant="destructive" className="w-full" disabled={!isValid}>
        {isDebt ? "— Add Debt Given" : "— Add Expense"}
      </Button>
    </form>
  );
}

// ============ SUBSCRIPTION FORM ============
function SubscriptionForm({ onAdd }: { onAdd: (s: Omit<Subscription, "id">) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState<AccountType>("bank");
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState("");

  const isValid = !!(name.trim() && amount && date && category.trim() && (!isTrial || trialEndDate));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({ name, amount: parseFloat(amount), frequency, nextDate: date, category, account, includeInForecast: true, isTrial, trialEndDate: isTrial ? trialEndDate : undefined });
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setCategory(""); setAccount("bank"); setIsTrial(false); setTrialEndDate("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label className="text-xs">Service Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix" className="h-9" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" /></div>
        <div><Label className="text-xs">Frequency *</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Next Billing *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>
        <div><Label className="text-xs">Category *</Label>
          <CategorySelect value={category} onChange={setCategory} type="expense" /></div>
      </div>
      <div>
        <Label className="text-xs">Account *</Label>
        <AccountSelect value={account} onChange={setAccount} enabledAccounts={data.userProfile?.enabledAccounts} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isTrial} onCheckedChange={setIsTrial} />
        <Label className="text-xs">Free Trial</Label>
      </div>
      {isTrial && (
        <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 space-y-2">
          <p className="text-[10px] text-warning font-medium">⚠️ No charge will be forecast before trial ends</p>
          <div><Label className="text-xs">Trial End Date *</Label>
            <Input type="date" value={trialEndDate} onChange={(e) => setTrialEndDate(e.target.value)} className="h-9" /></div>
        </div>
      )}
      <Button type="submit" variant="destructive" className="w-full" disabled={!isValid}>— Add Subscription</Button>
    </form>
  );
}

// ============ INVESTMENT FORM ============
function InvestmentForm({ onAdd }: { onAdd: (i: Omit<Investment, "id">) => void }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState<AccountType>("bank");
  const [expectedReturn, setExpectedReturn] = useState("10");

  const isValid = !!(name.trim() && amount && date && endDate && category.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({ name, amount: parseFloat(amount), frequency, startDate: date, endDate, category, account, expectedReturn: parseInt(expectedReturn), includeInForecast: true });
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setEndDate(""); setCategory(""); setAccount("bank"); setExpectedReturn("10");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label className="text-xs">Investment Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mutual Fund" className="h-9" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" /></div>
        <div><Label className="text-xs">Frequency *</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Start Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>
        <div><Label className="text-xs">End Date *</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Category *</Label>
          <CategorySelect value={category} onChange={setCategory} type="expense" /></div>
        <div><Label className="text-xs">Annual Return *</Label>
          <Select value={expectedReturn} onValueChange={setExpectedReturn}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 41 }, (_, i) => (<SelectItem key={i} value={String(i)}>{i}%</SelectItem>))}</SelectContent>
          </Select></div>
      </div>
      <div>
        <Label className="text-xs">Account *</Label>
        <AccountSelect value={account} onChange={setAccount} />
      </div>
      <Button type="submit" variant="destructive" className="w-full" disabled={!isValid}>— Add Investment</Button>
    </form>
  );
}

// ============ LISTS ============
function ExpenseList({ entries, fm, onToggle, onRemove, onUpdate }: {
  entries: Entry[]; fm: (n: number) => string; onToggle: (id: string) => void; onRemove: (id: string) => void;
  onUpdate: (id: string, u: Partial<Omit<Entry, "id">>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground px-1">EXPENSES ({entries.length})</p>
      {entries.map(entry => editingId === entry.id ? (
        <EditableEntryRow key={entry.id} entry={entry} onSave={(u) => { onUpdate(entry.id, u); setEditingId(null); }} onCancel={() => setEditingId(null)} />
      ) : (
        <ItemRow key={entry.id} label={entry.label} detail={`${fm(Math.abs(entry.amount))} / ${entry.frequency} · ${formatDate(entry.date)}`}
          category={entry.category} account={entry.account} checked={entry.includeInForecast} onToggle={() => onToggle(entry.id)}
          onEdit={() => setEditingId(entry.id)} onRemove={() => onRemove(entry.id)}
          isCheque={entry.isCheque} isDebtLinked={!!entry.debtLinkId} isOptional={entry.isOptional}
        />
      ))}
    </div>
  );
}

function SubscriptionList({ subscriptions, fm, onToggle, onRemove, onUpdate }: {
  subscriptions: Subscription[]; fm: (n: number) => string; onToggle: (id: string) => void; onRemove: (id: string) => void;
  onUpdate: (id: string, u: Partial<Omit<Subscription, "id">>) => void;
}) {
  if (subscriptions.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground px-1">SUBSCRIPTIONS ({subscriptions.length})</p>
      {subscriptions.map(sub => (
        <ItemRow key={sub.id} label={sub.name} detail={`${fm(sub.amount)} / ${sub.frequency} · Next: ${formatDate(sub.nextDate)}`}
          category={sub.category} account={sub.account} checked={sub.includeInForecast} onToggle={() => onToggle(sub.id)}
          onRemove={() => onRemove(sub.id)}
          extra={sub.isTrial ? <Badge className="text-[9px] bg-warning/20 text-warning border-warning/30">Trial</Badge> : null}
        />
      ))}
    </div>
  );
}

function InvestmentList({ investments, fm, onRemove, onUpdate }: {
  investments: Investment[]; fm: (n: number) => string; onRemove: (id: string) => void;
  onUpdate: (id: string, u: Partial<Omit<Investment, "id">>) => void;
}) {
  if (investments.length === 0) return null;

  const totals = investments.reduce((acc, inv) => {
    const vals = computeInvestmentValue(inv);
    acc.invested += vals.totalInvested;
    acc.profit += vals.profit;
    acc.value += vals.currentValue;
    return acc;
  }, { invested: 0, profit: 0, value: 0 });

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground px-1">INVESTMENTS ({investments.length})</p>
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-3 px-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] text-muted-foreground">Invested</p><p className="text-sm font-bold">{fm(totals.invested)}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Profit</p><p className="text-sm font-bold text-success">{fm(totals.profit)}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Value</p><p className="text-sm font-bold text-primary">{fm(totals.value)}</p></div>
          </div>
        </CardContent>
      </Card>
      {investments.map(inv => {
        const vals = computeInvestmentValue(inv);
        const isMatured = new Date(inv.endDate) <= new Date();
        return (
          <Card key={inv.id}>
            <CardContent className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-medium truncate">{inv.name}</p>
                  <Badge variant="outline" className="text-[10px]">{inv.category}</Badge>
                  <Badge variant={isMatured ? "default" : "secondary"} className="text-[10px]">{isMatured ? "Matured" : "Active"}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onRemove(inv.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2 text-center">
                <div><p className="text-[10px] text-muted-foreground">Invested</p><p className="text-xs font-bold">{fm(vals.totalInvested)}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Profit</p><p className="text-xs font-bold text-success">{fm(vals.profit)}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Value</p><p className="text-xs font-bold text-primary">{fm(vals.currentValue)}</p></div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ SHARED COMPONENTS ============
function ItemRow({ label, detail, category, account, checked, onToggle, onEdit, onRemove, extra, isCheque, isDebtLinked, isOptional }: {
  label: string; detail: string; category: string; account?: AccountType; checked: boolean;
  onToggle: () => void; onEdit?: () => void; onRemove: () => void; extra?: React.ReactNode;
  isCheque?: boolean; isDebtLinked?: boolean; isOptional?: boolean;
}) {
  return (
    <Card className={isCheque ? "border-l-4 border-l-amber-400" : isDebtLinked ? "border-l-4 border-l-orange-400" : ""}>
      <CardContent className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Switch checked={checked} onCheckedChange={onToggle} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-medium truncate">{label}</p>
              {extra}
              {isCheque && <Badge className="text-[9px] bg-amber-500/20 text-amber-400 border-amber-500/30">Cheque</Badge>}
              {isDebtLinked && <Badge className="text-[9px] bg-orange-500/20 text-orange-400 border-orange-500/30">Debt</Badge>}
              {isOptional && <Badge variant="outline" className="text-[9px]">Optional</Badge>}
            </div>
            <p className="text-[10px] text-muted-foreground">{detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {account && <Badge variant="secondary" className="text-[10px]">{ACCOUNT_LABELS[account]}</Badge>}
          <Badge variant="outline" className="text-[10px]">{category}</Badge>
          {onEdit && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditableEntryRow({ entry, onSave, onCancel }: { entry: Entry; onSave: (u: Partial<Omit<Entry, "id">>) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(Math.abs(entry.amount)));
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
          <CategorySelect value={category} onChange={setCategory} type="expense" className="h-8" />
          <FrequencySelect value={frequency} onChange={setFrequency} className="h-8" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
          <AccountSelect value={account} onChange={setAccount} className="h-8" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button size="sm" onClick={() => onSave({ label, amount: -Math.abs(parseFloat(amount) || 0), frequency, date, category, account })}><Check className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
