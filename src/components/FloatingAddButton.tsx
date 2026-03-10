import { useState } from "react";
import { Plus, X, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, CreditCard, Landmark, Target, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { CategorySelect } from "@/components/CategorySelect";
import { FrequencySelect } from "@/components/FrequencySelect";
import { AccountSelect } from "@/components/AccountSelect";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, ACCOUNT_LABELS } from "@/lib/constants";
import type { AppData, Entry, Frequency, Investment, Subscription, Transfer, AccountType, Goal, OtherAsset, LiabilityPayoff, AppSettings } from "@/lib/finance-types";
import { todayStr, formatMoney } from "@/lib/finance-utils";
import { GoalPlanner } from "@/components/GoalPlanner";
import { getContextualInsight } from "@/lib/insight-engine";
import { toast } from "sonner";

type AddAction = "income" | "expense" | "transfer" | "subscription" | "debt" | "goal" | "payoff";

interface FloatingAddButtonProps {
  data: AppData;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onAddSubscription: (sub: Omit<Subscription, "id">) => void;
  onAddInvestment: (inv: Omit<Investment, "id">) => void;
  onAddTransfer: (transfer: Omit<Transfer, "id">) => void;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onAddLiabilityPayoff?: (payoff: Omit<LiabilityPayoff, "id">) => void;
  onAddDebtWithPlan: (parentEntry: Omit<Entry, "id">, plan: { splits: number; frequency: Frequency; startDate: string; direction: "received" | "given" }) => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
}

const actions: { key: AddAction; label: string; icon: typeof ArrowDownLeft; color: string; desc: string }[] = [
  { key: "income", label: "Income", icon: ArrowDownLeft, color: "text-success", desc: "Salary, freelance, debt received" },
  { key: "expense", label: "Expense", icon: ArrowUpRight, color: "text-destructive", desc: "Bills, groceries, one-time costs" },
  { key: "subscription", label: "Subscription", icon: CreditCard, color: "text-warning", desc: "Netflix, gym, recurring services" },
  { key: "transfer", label: "Inter Transfer (Own)", icon: ArrowLeftRight, color: "text-info", desc: "Move money between your accounts" },
  { key: "debt", label: "Debt / Liability", icon: Landmark, color: "text-orange-400", desc: "Loan payoff, debt given/received" },
  { key: "goal", label: "Achieve a Goal", icon: Target, color: "text-primary", desc: "Save for a purchase or dream" },
  { key: "payoff", label: "Pay off a Debt", icon: ShieldCheck, color: "text-emerald-500", desc: "Plan to clear a loan or credit card" },
];

function saveCustomCategory(
  category: string,
  type: "income" | "expense",
  data: AppData,
  onUpdateSettings?: (updates: Partial<AppSettings>) => void
) {
  if (!onUpdateSettings || !category.trim()) return;
  const defaults = type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  if (defaults.includes(category as any)) return;
  
  const key = type === "income" ? "customIncomeCategories" : "customExpenseCategories";
  const existing = data.settings?.[key] || [];
  if (existing.includes(category)) return;
  
  onUpdateSettings({ [key]: [...existing, category] });
}

export function FloatingAddButton(props: FloatingAddButtonProps) {
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<AddAction | null>(null);

  const handleSelect = (action: AddAction) => {
    setActiveAction(action);
  };

  const handleClose = () => {
    setOpen(false);
    setActiveAction(null);
  };

  const handleDone = () => {
    setActiveAction(null);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Add new"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Backdrop + Bottom Sheet */}
      {open && (
        <div className="fixed inset-0 z-[100]" onClick={handleClose}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />

          {/* Bottom Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3">
              <div>
                {activeAction ? (
                  <button
                    onClick={() => setActiveAction(null)}
                    className="text-sm text-primary font-medium flex items-center gap-1"
                  >
                    ← Back
                  </button>
                ) : (
                  <h2 className="text-lg font-bold text-foreground">What do you want to add?</h2>
                )}
              </div>
              <button
                onClick={handleClose}
                className="rounded-full p-2 hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-8 safe-area-bottom">
              {!activeAction ? (
                /* Action Menu */
                <div className="space-y-2 animate-fade-in">
                  {actions.map(({ key, label, icon: Icon, color, desc }) => (
                    <button
                      key={key}
                      onClick={() => handleSelect(key)}
                      className="w-full flex items-center gap-4 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3.5 text-left transition-all hover:bg-muted/60 hover:border-border active:scale-[0.98]"
                    >
                      <div className={`rounded-xl p-2.5 bg-background ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{label}</p>
                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* Form */
                <div className="animate-fade-in">
                  {activeAction === "income" && (
                    <IncomeForm data={props.data} onAdd={props.onAddEntry} onDone={handleDone} onUpdateSettings={props.onUpdateSettings} />
                  )}
                  {activeAction === "expense" && (
                    <ExpenseForm data={props.data} onAdd={props.onAddEntry} onDone={handleDone} onUpdateSettings={props.onUpdateSettings} />
                  )}
                  {activeAction === "transfer" && (
                    <TransferForm data={props.data} onAdd={props.onAddTransfer} onDone={handleDone} />
                  )}
                  {activeAction === "subscription" && (
                    <SubscriptionForm data={props.data} onAdd={props.onAddSubscription} onDone={handleDone} onUpdateSettings={props.onUpdateSettings} />
                  )}
                  {activeAction === "debt" && (
                    <DebtForm data={props.data} onAdd={props.onAddEntry} onAddDebtWithPlan={props.onAddDebtWithPlan} onDone={handleDone} />
                  )}
                  {(activeAction === "goal" || activeAction === "payoff") && (
                    <GoalPlanner
                      data={props.data}
                      onAddGoal={props.onAddGoal}
                      onAddOtherAsset={props.onAddOtherAsset}
                      onAddEntry={props.onAddEntry}
                      onAddLiabilityPayoff={props.onAddLiabilityPayoff}
                      onAddTransfer={props.onAddTransfer}
                      fm={(n: number) => formatMoney(n, props.data.userProfile)}
                      initialStep={activeAction === "payoff" ? "pay_off_debt" : "buy_something"}
                      onDone={handleDone}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============ INCOME FORM ============
function IncomeForm({ data, onAdd, onDone, onUpdateSettings }: {
  data: AppData;
  onAdd: (e: Omit<Entry, "id">) => string;
  onDone: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("Other");
  const [account, setAccount] = useState<AccountType>("bank");

  const customCategories = data.settings?.customIncomeCategories || [];
  const isValid = !!(name.trim() && amount && date && category.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    saveCustomCategory(category, "income", data, onUpdateSettings);
    onAdd({ label: name, amount: Math.abs(parseFloat(amount)), date, frequency, category, account, includeInForecast: true });
    const insight = getContextualInsight(data, category, Math.abs(parseFloat(amount)), "income");
    if (insight) setTimeout(() => toast(insight, { duration: 4000 }), 500);
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setCategory("Other"); setAccount("bank");
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-success uppercase tracking-wider mb-2">Income</p>
      <div>
        <Label className="text-xs">Description *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Salary" className="h-10" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-10" /></div>
        <div><Label className="text-xs">Frequency</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} className="h-10 z-[110]" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Date *</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" /></div>
        <div><Label className="text-xs">Category *</Label>
          <CategorySelect value={category} onChange={setCategory} type="income" className="h-10" customCategories={customCategories} /></div>
      </div>
      <div><Label className="text-xs">Account</Label>
        <AccountSelect value={account} onChange={setAccount} enabledAccounts={data.userProfile?.enabledAccounts} className="h-10" /></div>
      <Button type="submit" className="w-full h-11 bg-success hover:bg-success/90 text-success-foreground font-semibold" disabled={!isValid}>
        Add Income
      </Button>
    </form>
  );
}

// ============ EXPENSE FORM ============
function ExpenseForm({ data, onAdd, onDone, onUpdateSettings }: {
  data: AppData;
  onAdd: (e: Omit<Entry, "id">) => string;
  onDone: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("Other");
  const [account, setAccount] = useState<AccountType>("bank");
  const [isCheque, setIsCheque] = useState(false);

  const customCategories = data.settings?.customExpenseCategories || [];
  const isValid = !!(name.trim() && amount && date && category.trim());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    saveCustomCategory(category, "expense", data, onUpdateSettings);
    onAdd({
      label: name, amount: -Math.abs(parseFloat(amount)), date, frequency, category, account,
      includeInForecast: true, isCheque: (account === "bank" && isCheque) || undefined,
    });
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setCategory("Other"); setAccount("bank"); setIsCheque(false);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Expense</p>
      <div>
        <Label className="text-xs">Description *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Groceries" className="h-10" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-10" /></div>
        <div><Label className="text-xs">Frequency</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} className="h-10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Date *</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" /></div>
        <div><Label className="text-xs">Category *</Label>
          <CategorySelect value={category} onChange={setCategory} type="expense" className="h-10" customCategories={customCategories} /></div>
      </div>
      <div><Label className="text-xs">Account</Label>
        <AccountSelect value={account} onChange={setAccount} enabledAccounts={data.userProfile?.enabledAccounts} className="h-10" /></div>
      {account === "bank" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <Checkbox id="cheque-fab" checked={isCheque} onCheckedChange={(v) => setIsCheque(!!v)} />
          <Label htmlFor="cheque-fab" className="text-xs cursor-pointer text-amber-400">Mark as Cheque payment</Label>
        </div>
      )}
      <Button type="submit" variant="destructive" className="w-full h-11 font-semibold" disabled={!isValid}>
        Add Expense
      </Button>
    </form>
  );
}

// ============ TRANSFER FORM ============
function TransferForm({ data, onAdd, onDone }: {
  data: AppData;
  onAdd: (t: Omit<Transfer, "id">) => void;
  onDone: () => void;
}) {
  const [fromAccount, setFromAccount] = useState<AccountType>("bank");
  const [toAccount, setToAccount] = useState<AccountType>("cash");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [reason, setReason] = useState("");

  const isValid = !!(amount && parseFloat(amount) > 0 && fromAccount !== toAccount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onAdd({
      fromAccount, toAccount, amount: parseFloat(amount), date,
      reason: reason || `${ACCOUNT_LABELS[fromAccount]} → ${ACCOUNT_LABELS[toAccount]}`,
      isApplied: true,
    });
    setAmount(""); setReason("");
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-info uppercase tracking-wider mb-2">Inter Transfer (Own)</p>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">From Account</Label>
          <AccountSelect value={fromAccount} onChange={setFromAccount} enabledAccounts={data.userProfile?.enabledAccounts} className="h-10" /></div>
        <div><Label className="text-xs">To Account</Label>
          <AccountSelect value={toAccount} onChange={setToAccount} enabledAccounts={data.userProfile?.enabledAccounts} className="h-10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-10" autoFocus /></div>
        <div><Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" /></div>
      </div>
      <div><Label className="text-xs">Reason (optional)</Label>
        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Cover rent" className="h-10" /></div>
      <Button type="submit" className="w-full h-11 bg-info hover:bg-info/90 text-info-foreground font-semibold" disabled={!isValid}>
        Add Transfer
      </Button>
    </form>
  );
}

// ============ SUBSCRIPTION FORM ============
function SubscriptionForm({ data, onAdd, onDone, onUpdateSettings }: {
  data: AppData;
  onAdd: (s: Omit<Subscription, "id">) => void;
  onDone: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("Other");
  const [account, setAccount] = useState<AccountType>("bank");
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState("");

  const customCategories = data.settings?.customExpenseCategories || [];
  const isValid = !!(name.trim() && amount && date && category.trim() && (!isTrial || trialEndDate));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    saveCustomCategory(category, "expense", data, onUpdateSettings);
    onAdd({ name, amount: parseFloat(amount), frequency, nextDate: date, category, account, includeInForecast: true, isTrial, trialEndDate: isTrial ? trialEndDate : undefined });
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setCategory("Other"); setAccount("bank"); setIsTrial(false); setTrialEndDate("");
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">Subscription</p>
      <div><Label className="text-xs">Service Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Netflix" className="h-10" autoFocus /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-10" /></div>
        <div><Label className="text-xs">Frequency</Label>
          <FrequencySelect value={frequency} onChange={setFrequency} className="h-10" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Next Billing *</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" /></div>
        <div><Label className="text-xs">Category *</Label>
          <CategorySelect value={category} onChange={setCategory} type="expense" className="h-10" customCategories={customCategories} /></div>
      </div>
      <div><Label className="text-xs">Account</Label>
        <AccountSelect value={account} onChange={setAccount} enabledAccounts={data.userProfile?.enabledAccounts} className="h-10" /></div>
      <div className="flex items-center gap-3 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2.5">
        <Switch checked={isTrial} onCheckedChange={setIsTrial} />
        <Label className="text-xs">Free Trial</Label>
      </div>
      {isTrial && (
        <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 space-y-2">
          <p className="text-[10px] text-warning font-medium">⚠️ No charge will be forecast before trial ends</p>
          <div><Label className="text-xs">Trial End Date *</Label>
            <Input type="date" value={trialEndDate} onChange={e => setTrialEndDate(e.target.value)} className="h-10" /></div>
        </div>
      )}
      <Button type="submit" className="w-full h-11 bg-warning hover:bg-warning/90 text-warning-foreground font-semibold" disabled={!isValid}>
        Add Subscription
      </Button>
    </form>
  );
}

// ============ DEBT FORM ============
function DebtForm({ data, onAdd, onAddDebtWithPlan, onDone }: {
  data: AppData;
  onAdd: (e: Omit<Entry, "id">) => string;
  onAddDebtWithPlan: FloatingAddButtonProps["onAddDebtWithPlan"];
  onDone: () => void;
}) {
  const [direction, setDirection] = useState<"received" | "given">("received");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [account, setAccount] = useState<AccountType>("bank");
  const [splits, setSplits] = useState("1");
  const [repayFrequency, setRepayFrequency] = useState<Frequency>("monthly");
  const [repayStartDate, setRepayStartDate] = useState(todayStr());

  const isValid = !!(name.trim() && amount && date);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const amt = parseFloat(amount);
    const entry: Omit<Entry, "id"> = {
      label: name,
      amount: direction === "received" ? Math.abs(amt) : -Math.abs(amt),
      date, frequency: "once" as Frequency, category: "Debt", account, includeInForecast: true,
    };

    if (parseInt(splits) > 0) {
      onAddDebtWithPlan(entry, {
        splits: parseInt(splits) || 1,
        frequency: repayFrequency,
        startDate: repayStartDate,
        direction,
      });
    } else {
      onAdd(entry);
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-2">Debt / Liability</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setDirection("received")}
          className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${direction === "received" ? "bg-success/20 text-success border border-success/40" : "bg-muted/30 text-muted-foreground border border-border/50"}`}>
          Debt Received
        </button>
        <button type="button" onClick={() => setDirection("given")}
          className={`rounded-xl py-2.5 text-xs font-semibold transition-all ${direction === "given" ? "bg-destructive/20 text-destructive border border-destructive/40" : "bg-muted/30 text-muted-foreground border border-border/50"}`}>
          Debt Given
        </button>
      </div>
      <div><Label className="text-xs">Description *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder={direction === "received" ? "e.g. Loan from Ahmed" : "e.g. Lent to Fatima"} className="h-10" autoFocus /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-xs">Amount *</Label>
          <Input type="number" inputMode="decimal" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="h-10" /></div>
        <div><Label className="text-xs">Date *</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-10" /></div>
      </div>
      <div><Label className="text-xs">Account</Label>
        <AccountSelect value={account} onChange={setAccount} enabledAccounts={data.userProfile?.enabledAccounts} className="h-10" /></div>
      
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 space-y-3">
        <p className="text-xs font-semibold text-orange-400">📋 {direction === "received" ? "Repayment" : "Recovery"} Plan</p>
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Number of Splits</Label>
            <Input type="number" min="1" max="120" value={splits} onChange={e => setSplits(e.target.value)} className="h-10" /></div>
          <div><Label className="text-xs">Frequency</Label>
            <FrequencySelect value={repayFrequency} onChange={setRepayFrequency} className="h-10" /></div>
        </div>
        <div><Label className="text-xs">{direction === "received" ? "Repayment" : "Recovery"} Start Date</Label>
          <Input type="date" value={repayStartDate} onChange={e => setRepayStartDate(e.target.value)} className="h-10" /></div>
      </div>

      <Button type="submit" className="w-full h-11 bg-orange-500 hover:bg-orange-500/90 text-white font-semibold" disabled={!isValid}>
        {direction === "received" ? "Add Debt Received" : "Add Debt Given"}
      </Button>
    </form>
  );
}
