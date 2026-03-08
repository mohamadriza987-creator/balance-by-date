import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { Trash2, Pencil, Check, X, Minus, Plus } from "lucide-react";
import type { Entry, Frequency, Investment, Subscription } from "@/lib/finance-types";
import { todayStr, formatDate, formatMoney, computeInvestmentValue } from "@/lib/finance-utils";

type OutflowMode = "expense" | "subscription" | "investment";

interface OutflowTabProps {
  entries: Entry[];
  subscriptions: Subscription[];
  investments: Investment[];
  onAddEntry: (entry: Omit<Entry, "id">) => void;
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
  expenseDescriptions?: string[];
  subscriptionDescriptions?: string[];
  investmentDescriptions?: string[];
  expenseCategories?: string[];
  subscriptionCategories?: string[];
  investmentCategories?: string[];
}

const freqLabel: Record<string, string> = {
  once: "One-time", weekly: "Weekly", biweekly: "Bi-weekly",
  monthly: "Monthly", quarterly: "Quarterly", halfyearly: "Half-yearly", yearly: "Yearly",
};

export function OutflowTab({
  entries, subscriptions, investments,
  onAddEntry, onAddSubscription, onAddInvestment,
  onRemoveEntry, onRemoveSubscription, onRemoveInvestment,
  onToggleEntry, onToggleSubscription,
  onUpdateEntry, onUpdateSubscription, onUpdateInvestment,
  expenseDescriptions = [], subscriptionDescriptions = [], investmentDescriptions = [],
  expenseCategories = [], subscriptionCategories = [], investmentCategories = [],
}: OutflowTabProps) {
  const [mode, setMode] = useState<OutflowMode>("expense");
  const [showForm, setShowForm] = useState(false);

  const expenseEntries = entries.filter(e => e.amount < 0);

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="grid grid-cols-3 gap-1.5">
        {(["expense", "subscription", "investment"] as OutflowMode[]).map((m) => (
          <Button key={m} variant={mode === m ? "default" : "outline"} size="sm"
            className="text-xs h-9"
            onClick={() => { setMode(m); setShowForm(false); }}>
            {m === "subscription" ? "Subs" : m === "investment" ? "Invest" : "Expense"}
          </Button>
        ))}
      </div>

      {/* Quick Add */}
      <Card className="border-destructive/30">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-destructive">
              — {mode === "subscription" ? "SUBSCRIPTION" : mode === "investment" ? "INVESTMENT" : "EXPENSE"}
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : <><Plus className="h-3.5 w-3.5 mr-1" /> New</>}
            </Button>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="px-4 pb-4">
            {mode === "expense" && (
              <ExpenseForm
                onAdd={onAddEntry}
                descriptions={expenseDescriptions}
                categories={expenseCategories}
                onDone={() => setShowForm(false)}
              />
            )}
            {mode === "subscription" && (
              <SubscriptionForm
                onAdd={onAddSubscription}
                descriptions={subscriptionDescriptions}
                categories={subscriptionCategories}
                onDone={() => setShowForm(false)}
              />
            )}
            {mode === "investment" && (
              <InvestmentForm
                onAdd={onAddInvestment}
                descriptions={investmentDescriptions}
                categories={investmentCategories}
                onDone={() => setShowForm(false)}
              />
            )}
          </CardContent>
        )}
      </Card>

      {/* List */}
      {mode === "expense" && <ExpenseList entries={expenseEntries} onToggle={onToggleEntry} onRemove={onRemoveEntry} onUpdate={onUpdateEntry} />}
      {mode === "subscription" && <SubscriptionList subscriptions={subscriptions} onToggle={onToggleSubscription} onRemove={onRemoveSubscription} onUpdate={onUpdateSubscription} />}
      {mode === "investment" && <InvestmentList investments={investments} onRemove={onRemoveInvestment} onUpdate={onUpdateInvestment} />}
    </div>
  );
}

// ============ EXPENSE FORM ============
function ExpenseForm({ onAdd, descriptions, categories, onDone }: {
  onAdd: (e: Omit<Entry, "id">) => void; descriptions: string[]; categories: string[]; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");

  const isValid = !!(name.trim() && amount && date && category.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({ label: name, amount: -Math.abs(parseFloat(amount)), date, frequency, category, includeInForecast: true });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Label className="text-xs">Description *</Label>
        <AutocompleteInput value={name} onChange={setName} suggestions={descriptions} placeholder="e.g. Groceries" capitalize />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount ($) *</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" /></div>
        <div><Label className="text-xs">Frequency *</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Date *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>
        <div><Label className="text-xs">Category *</Label>
          <AutocompleteInput value={category} onChange={setCategory} suggestions={categories} placeholder="e.g. Food" capitalize /></div>
      </div>
      <Button type="submit" variant="destructive" className="w-full" disabled={!isValid}>— Add Expense</Button>
    </form>
  );
}

// ============ SUBSCRIPTION FORM ============
function SubscriptionForm({ onAdd, descriptions, categories, onDone }: {
  onAdd: (s: Omit<Subscription, "id">) => void; descriptions: string[]; categories: string[]; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState("");

  const isValid = !!(name.trim() && amount && date && category.trim() && (!isTrial || trialEndDate));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({ name, amount: parseFloat(amount), frequency, nextDate: date, category, includeInForecast: true, isTrial, trialEndDate: isTrial ? trialEndDate : undefined });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label className="text-xs">Service Name *</Label>
        <AutocompleteInput value={name} onChange={setName} suggestions={descriptions} placeholder="e.g. Netflix" capitalize /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount ($) *</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" /></div>
        <div><Label className="text-xs">Frequency *</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Next Billing *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>
        <div><Label className="text-xs">Category *</Label>
          <AutocompleteInput value={category} onChange={setCategory} suggestions={categories} placeholder="e.g. Entertainment" capitalize /></div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={isTrial} onCheckedChange={setIsTrial} />
        <Label className="text-xs">Free Trial</Label>
      </div>
      {isTrial && (
        <div><Label className="text-xs">Trial End Date *</Label>
          <Input type="date" value={trialEndDate} onChange={(e) => setTrialEndDate(e.target.value)} className="h-9" /></div>
      )}
      <Button type="submit" variant="destructive" className="w-full" disabled={!isValid}>— Add Subscription</Button>
    </form>
  );
}

// ============ INVESTMENT FORM ============
function InvestmentForm({ onAdd, descriptions, categories, onDone }: {
  onAdd: (i: Omit<Investment, "id">) => void; descriptions: string[]; categories: string[]; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("10");

  const isValid = !!(name.trim() && amount && date && endDate && category.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({ name, amount: parseFloat(amount), frequency, startDate: date, endDate, category, expectedReturn: parseInt(expectedReturn), includeInForecast: true });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div><Label className="text-xs">Investment Name *</Label>
        <AutocompleteInput value={name} onChange={setName} suggestions={descriptions} placeholder="e.g. Mutual Fund" capitalize /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount ($) *</Label>
          <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" /></div>
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
          <AutocompleteInput value={category} onChange={setCategory} suggestions={categories} placeholder="e.g. Stocks" capitalize /></div>
        <div><Label className="text-xs">Annual Return *</Label>
          <Select value={expectedReturn} onValueChange={setExpectedReturn}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>{Array.from({ length: 41 }, (_, i) => (<SelectItem key={i} value={String(i)}>{i}%</SelectItem>))}</SelectContent>
          </Select></div>
      </div>
      <Button type="submit" variant="destructive" className="w-full" disabled={!isValid}>— Add Investment</Button>
    </form>
  );
}

// ============ LISTS ============
function ExpenseList({ entries, onToggle, onRemove, onUpdate }: {
  entries: Entry[]; onToggle: (id: string) => void; onRemove: (id: string) => void;
  onUpdate: (id: string, u: Partial<Omit<Entry, "id">>) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  if (entries.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground"><p className="text-sm">No expenses yet.</p></CardContent></Card>;
  return (
    <div className="space-y-2">
      {entries.map(entry => editingId === entry.id ? (
        <EditableEntryRow key={entry.id} entry={entry} onSave={(u) => { onUpdate(entry.id, u); setEditingId(null); }} onCancel={() => setEditingId(null)} />
      ) : (
        <ItemRow key={entry.id} label={entry.label} detail={`${formatMoney(Math.abs(entry.amount))} / ${entry.frequency} · ${formatDate(entry.date)}`}
          category={entry.category} checked={entry.includeInForecast} onToggle={() => onToggle(entry.id)}
          onEdit={() => setEditingId(entry.id)} onRemove={() => onRemove(entry.id)} />
      ))}
    </div>
  );
}

function SubscriptionList({ subscriptions, onToggle, onRemove, onUpdate }: {
  subscriptions: Subscription[]; onToggle: (id: string) => void; onRemove: (id: string) => void;
  onUpdate: (id: string, u: Partial<Omit<Subscription, "id">>) => void;
}) {
  if (subscriptions.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground"><p className="text-sm">No subscriptions yet.</p></CardContent></Card>;
  return (
    <div className="space-y-2">
      {subscriptions.map(sub => (
        <ItemRow key={sub.id} label={sub.name} detail={`${formatMoney(sub.amount)} / ${sub.frequency} · Next: ${formatDate(sub.nextDate)}`}
          category={sub.category} checked={sub.includeInForecast} onToggle={() => onToggle(sub.id)}
          onRemove={() => onRemove(sub.id)}
          extra={sub.isTrial ? <Badge className="text-[9px] bg-warning/20 text-warning border-warning/30">Trial</Badge> : null}
        />
      ))}
    </div>
  );
}

function InvestmentList({ investments, onRemove, onUpdate }: {
  investments: Investment[]; onRemove: (id: string) => void;
  onUpdate: (id: string, u: Partial<Omit<Investment, "id">>) => void;
}) {
  if (investments.length === 0) return <Card><CardContent className="py-8 text-center text-muted-foreground"><p className="text-sm">No investments yet.</p></CardContent></Card>;

  const totals = investments.reduce((acc, inv) => {
    const vals = computeInvestmentValue(inv);
    acc.invested += vals.totalInvested;
    acc.profit += vals.profit;
    acc.value += vals.currentValue;
    return acc;
  }, { invested: 0, profit: 0, value: 0 });

  return (
    <div className="space-y-2">
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="py-3 px-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[10px] text-muted-foreground">Invested</p><p className="text-sm font-bold">{formatMoney(totals.invested)}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Profit</p><p className="text-sm font-bold text-success">{formatMoney(totals.profit)}</p></div>
            <div><p className="text-[10px] text-muted-foreground">Value</p><p className="text-sm font-bold text-primary">{formatMoney(totals.value)}</p></div>
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
                <div><p className="text-[10px] text-muted-foreground">Invested</p><p className="text-xs font-bold">{formatMoney(vals.totalInvested)}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Profit</p><p className="text-xs font-bold text-green-600 dark:text-green-400">{formatMoney(vals.profit)}</p></div>
                <div><p className="text-[10px] text-muted-foreground">Value</p><p className="text-xs font-bold text-primary">{formatMoney(vals.currentValue)}</p></div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ============ SHARED COMPONENTS ============
function ItemRow({ label, detail, category, checked, onToggle, onEdit, onRemove, extra }: {
  label: string; detail: string; category: string; checked: boolean;
  onToggle: () => void; onEdit?: () => void; onRemove: () => void; extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Switch checked={checked} onCheckedChange={onToggle} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate">{label}</p>
              {extra}
            </div>
            <p className="text-[10px] text-muted-foreground">{detail}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
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

  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-8" />
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-8" />
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="h-8" />
          <FrequencySelect value={frequency} onChange={setFrequency} />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button size="sm" onClick={() => onSave({ label, amount: -Math.abs(parseFloat(amount) || 0), frequency, date, category })}><Check className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FrequencySelect({ value, onChange }: { value: Frequency; onChange: (v: Frequency) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Frequency)}>
      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="once">One-time</SelectItem>
        <SelectItem value="weekly">Weekly</SelectItem>
        <SelectItem value="biweekly">Bi-weekly</SelectItem>
        <SelectItem value="monthly">Monthly</SelectItem>
        <SelectItem value="quarterly">Quarterly</SelectItem>
        <SelectItem value="halfyearly">Half-yearly</SelectItem>
        <SelectItem value="yearly">Yearly</SelectItem>
      </SelectContent>
    </Select>
  );
}
