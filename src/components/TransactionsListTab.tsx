import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, ArrowLeftRight, ArrowDownLeft, ArrowUpRight, CreditCard, Target, Landmark, RefreshCw } from "lucide-react";
import { AccountSelect } from "@/components/AccountSelect";
import { CategorySelect } from "@/components/CategorySelect";
import type { AppData, AccountType, Entry, Subscription, Transfer, Frequency } from "@/lib/finance-types";
import { formatMoney, formatDate, todayStr, getNextOccurrence } from "@/lib/finance-utils";
import { ACCOUNT_LABELS, TYPE_COLORS } from "@/lib/constants";

// A unified transaction item for display
interface UnifiedTransaction {
  id: string;
  sourceType: "entry" | "subscription" | "transfer" | "investment" | "cc_bill" | "goal_contribution" | "debt_payoff" | "liability_payoff";
  sourceId: string; // ID of the original item
  name: string;
  amount: number;
  date: string;
  category: string;
  account?: AccountType;
  description?: string;
  // For transfers
  fromAccount?: AccountType;
  toAccount?: AccountType;
  // Editability
  editable: boolean;
  deletable: boolean;
}

interface TransactionsListTabProps {
  data: AppData;
  onUpdateEntry: (id: string, updates: Partial<Omit<Entry, "id">>) => void;
  onRemoveEntry: (id: string) => void;
  onUpdateSubscription: (id: string, updates: Partial<Omit<Subscription, "id">>) => void;
  onRemoveSubscription: (id: string) => void;
  onRemoveTransfer: (id: string) => void;
  onRemoveInvestment: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  entry: "Entry",
  subscription: "Subscription",
  transfer: "Transfer",
  investment: "Investment",
  cc_bill: "CC Settlement",
  goal_contribution: "Goal",
  debt_payoff: "Debt Payoff",
  liability_payoff: "Liability",
};

const typeIcons: Record<string, typeof ArrowDownLeft> = {
  entry: ArrowDownLeft,
  subscription: RefreshCw,
  transfer: ArrowLeftRight,
  investment: Landmark,
  cc_bill: CreditCard,
  goal_contribution: Target,
  debt_payoff: Landmark,
  liability_payoff: Landmark,
};

function getTypeBadgeStyle(sourceType: string, amount: number): string {
  if (sourceType === "transfer") return TYPE_COLORS.transfer || "";
  if (sourceType === "subscription") return TYPE_COLORS.subscription || "";
  if (sourceType === "cc_bill") return TYPE_COLORS.cc_bill || "";
  if (sourceType === "goal_contribution") return TYPE_COLORS.goal_contribution || "";
  if (sourceType === "debt_payoff") return TYPE_COLORS.debt_payoff || "";
  if (sourceType === "investment") return TYPE_COLORS.investment || "";
  if (amount >= 0) return TYPE_COLORS.income || "";
  return TYPE_COLORS.expense || "";
}

function getTypeLabel(sourceType: string, amount: number): string {
  if (sourceType === "entry") return amount >= 0 ? "Income" : "Expense";
  return typeLabels[sourceType] || sourceType;
}

export function TransactionsListTab({
  data, onUpdateEntry, onRemoveEntry, onUpdateSubscription, onRemoveSubscription, onRemoveTransfer, onRemoveInvestment,
}: TransactionsListTabProps) {
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);
  const positionDate = data.positionDate || todayStr();

  const [editingTx, setEditingTx] = useState<UnifiedTransaction | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAccount, setEditAccount] = useState<AccountType>("bank");

  // Build unified transaction list up to positionDate
  const transactions = useMemo(() => {
    const txs: UnifiedTransaction[] = [];
    const refDate = todayStr(); // start from today

    // Entries (income/expense)
    for (const entry of data.entries) {
      if (!entry.includeInForecast) continue;
      if (entry.category === "Debt Payoff") continue;
      let d = entry.date;
      while (d <= positionDate) {
        if (d >= refDate || entry.frequency === "once") {
          if (d <= positionDate) {
            txs.push({
              id: `entry-${entry.id}-${d}`,
              sourceType: "entry",
              sourceId: entry.id,
              name: entry.label,
              amount: entry.amount,
              date: d,
              category: entry.category,
              account: entry.account,
              editable: true,
              deletable: true,
            });
          }
        }
        if (entry.frequency === "once") break;
        d = getNextOccurrence(d, entry.frequency);
      }
    }

    // Subscriptions
    for (const sub of data.subscriptions) {
      if (!sub.includeInForecast) continue;
      const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
      let d = chargeStart;
      while (d <= positionDate) {
        if (d >= refDate || sub.frequency === "once") {
          if (d <= positionDate) {
            txs.push({
              id: `sub-${sub.id}-${d}`,
              sourceType: "subscription",
              sourceId: sub.id,
              name: sub.name,
              amount: -sub.amount,
              date: d,
              category: sub.category,
              account: sub.account,
              editable: true,
              deletable: true,
            });
          }
        }
        if (sub.frequency === "once") break;
        d = getNextOccurrence(d, sub.frequency);
      }
    }

    // Investments
    for (const inv of (data.investments || [])) {
      if (!inv.includeInForecast) continue;
      let d = inv.startDate;
      while (d <= positionDate && d <= inv.endDate) {
        if (d >= refDate || inv.frequency === "once") {
          if (d <= positionDate) {
            txs.push({
              id: `inv-${inv.id}-${d}`,
              sourceType: "investment",
              sourceId: inv.id,
              name: `${inv.name} (Contribution)`,
              amount: -inv.amount,
              date: d,
              category: inv.category,
              account: inv.account,
              editable: false,
              deletable: true,
            });
          }
        }
        if (inv.frequency === "once") break;
        d = getNextOccurrence(d, inv.frequency);
      }
    }

    // Applied transfers
    for (const tr of (data.transfers || [])) {
      if (!tr.isApplied) continue;
      if (tr.date >= refDate && tr.date <= positionDate) {
        txs.push({
          id: `transfer-${tr.id}`,
          sourceType: "transfer",
          sourceId: tr.id,
          name: `${ACCOUNT_LABELS[tr.fromAccount]} → ${ACCOUNT_LABELS[tr.toAccount]}`,
          amount: -tr.amount,
          date: tr.date,
          category: "Transfer",
          account: tr.fromAccount,
          fromAccount: tr.fromAccount,
          toAccount: tr.toAccount,
          description: tr.reason,
          editable: false,
          deletable: true,
        });
      }
    }

    // Goal contributions
    for (const goal of (data.goals || [])) {
      if (goal.status !== "active") continue;
      let d = goal.startDate;
      while (d <= positionDate && d <= goal.targetDate) {
        if (d >= refDate) {
          txs.push({
            id: `goal-${goal.id}-${d}`,
            sourceType: goal.type === "purchase" ? "goal_contribution" : "debt_payoff",
            sourceId: goal.id,
            name: goal.type === "purchase" ? `Goal: ${goal.name}` : `Debt Payoff: ${goal.name}`,
            amount: -goal.contributionAmount,
            date: d,
            category: goal.type === "purchase" ? "Goal" : "Debt Payoff",
            account: goal.sourceAccount,
            editable: false,
            deletable: false,
          });
        }
        d = getNextOccurrence(d, goal.contributionFrequency);
      }
    }

    // Liability payoffs
    for (const lp of (data.liabilityPayoffs || [])) {
      if (lp.status !== "active") continue;
      let d = lp.startDate;
      while (d <= positionDate && d <= lp.targetDate) {
        if (d >= refDate) {
          txs.push({
            id: `liability-${lp.id}-${d}`,
            sourceType: "liability_payoff",
            sourceId: lp.id,
            name: `Liability: ${lp.name}`,
            amount: -lp.payoffAmount,
            date: d,
            category: "Liability",
            account: lp.sourceAccount,
            editable: false,
            deletable: false,
          });
        }
        d = getNextOccurrence(d, lp.payoffFrequency);
      }
    }

    // CC bill payments
    const billDay = (data.settings?.creditCardBillDay) || 15;
    const billMap: Record<string, number> = {};
    const getNextBillDate = (afterDate: string): string => {
      const ad = new Date(afterDate + "T00:00:00");
      const day = Math.min(billDay, 28);
      let billDate = new Date(ad.getFullYear(), ad.getMonth() + 1, day);
      if (billDate <= ad) billDate = new Date(ad.getFullYear(), ad.getMonth() + 2, day);
      return billDate.toISOString().slice(0, 10);
    };
    for (const entry of data.entries) {
      if (!entry.includeInForecast || entry.amount >= 0 || entry.account !== "creditCard") continue;
      let d = entry.date;
      while (d <= positionDate) {
        if (d >= refDate) {
          const bd = getNextBillDate(d);
          if (bd <= positionDate) billMap[bd] = (billMap[bd] || 0) + Math.abs(entry.amount);
        }
        if (entry.frequency === "once") break;
        d = getNextOccurrence(d, entry.frequency);
      }
    }
    for (const sub of data.subscriptions) {
      if (!sub.includeInForecast || sub.account !== "creditCard") continue;
      const cs = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
      let d = cs;
      while (d <= positionDate) {
        if (d >= refDate) {
          const bd = getNextBillDate(d);
          if (bd <= positionDate) billMap[bd] = (billMap[bd] || 0) + sub.amount;
        }
        if (sub.frequency === "once") break;
        d = getNextOccurrence(d, sub.frequency);
      }
    }
    for (const [bDate, bAmount] of Object.entries(billMap)) {
      if (bAmount > 0.01) {
        txs.push({
          id: `ccbill-${bDate}`,
          sourceType: "cc_bill",
          sourceId: bDate,
          name: "Credit Card Bill Payment",
          amount: -bAmount,
          date: bDate,
          category: "CC Settlement",
          account: "bank",
          editable: false,
          deletable: false,
        });
      }
    }

    // Sort by date descending (most recent first)
    txs.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
    return txs;
  }, [data, positionDate]);

  // Compute running balances (forward chronological order, then reverse for display)
  const transactionsWithBalance = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    let balance = data.currentBalance;
    const balanceMap = new Map<string, number>();
    for (const tx of sorted) {
      balance += tx.amount;
      balanceMap.set(tx.id, balance);
    }
    return transactions.map(tx => ({
      ...tx,
      balanceAfter: balanceMap.get(tx.id) ?? data.currentBalance,
    }));
  }, [transactions, data.currentBalance]);

  const openEditDialog = (tx: UnifiedTransaction) => {
    setEditingTx(tx);
    setEditName(tx.name);
    setEditAmount(Math.abs(tx.amount).toString());
    setEditDate(tx.date);
    setEditCategory(tx.category);
    setEditAccount(tx.account || "bank");
  };

  const handleSaveEdit = () => {
    if (!editingTx) return;
    const { sourceType, sourceId } = editingTx;

    if (sourceType === "entry") {
      const isIncome = editingTx.amount >= 0;
      onUpdateEntry(sourceId, {
        label: editName,
        amount: isIncome ? Math.abs(parseFloat(editAmount)) : -Math.abs(parseFloat(editAmount)),
        date: editDate,
        category: editCategory,
        account: editAccount,
      });
    } else if (sourceType === "subscription") {
      onUpdateSubscription(sourceId, {
        name: editName,
        amount: Math.abs(parseFloat(editAmount)),
        nextDate: editDate,
        category: editCategory,
        account: editAccount,
      });
    }
    setEditingTx(null);
  };

  const handleDelete = (tx: UnifiedTransaction) => {
    const { sourceType, sourceId } = tx;
    if (sourceType === "entry") onRemoveEntry(sourceId);
    else if (sourceType === "subscription") onRemoveSubscription(sourceId);
    else if (sourceType === "transfer") onRemoveTransfer(sourceId);
    else if (sourceType === "investment") onRemoveInvestment(sourceId);
  };

  const isEntryType = editingTx?.sourceType === "entry";
  const isSubType = editingTx?.sourceType === "subscription";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">All Transactions</h2>
          <p className="text-[10px] text-muted-foreground">
            Up to {formatDate(positionDate)} · {transactionsWithBalance.length} transactions
          </p>
        </div>
      </div>

      {/* Transaction List */}
      {transactionsWithBalance.length === 0 ? (
        <Card>
          <CardContent className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No transactions yet. Use the + button to add income, expenses, or transfers.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {transactionsWithBalance.map((tx) => {
            const Icon = typeIcons[tx.sourceType] || ArrowDownLeft;
            const isPositive = tx.amount >= 0;
            return (
              <Card key={tx.id} className="overflow-hidden">
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Icon */}
                  <div className={`shrink-0 rounded-lg p-2 ${getTypeBadgeStyle(tx.sourceType, tx.amount)}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium text-foreground truncate">{tx.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className={`text-[8px] px-1.5 py-0 ${getTypeBadgeStyle(tx.sourceType, tx.amount)}`}>
                        {getTypeLabel(tx.sourceType, tx.amount)}
                      </Badge>
                      {tx.account && (
                        <span className="text-[9px] text-muted-foreground">{ACCOUNT_LABELS[tx.account]}</span>
                      )}
                      <span className="text-[9px] text-muted-foreground">· {formatDate(tx.date)}</span>
                    </div>
                    {tx.description && (
                      <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{tx.description}</p>
                    )}
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                      Balance: {fm(tx.balanceAfter)}
                    </p>
                  </div>

                  {/* Amount + Edit */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <p className={`text-sm font-bold tabular-nums ${isPositive ? "text-success" : "text-destructive"}`}>
                      {isPositive ? "+" : ""}{fm(tx.amount)}
                    </p>
                    {(tx.editable || tx.deletable) && (
                      <button
                        onClick={() => tx.editable ? openEditDialog(tx) : handleDelete(tx)}
                        className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        {tx.editable ? <Pencil className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTx && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs">Transaction Name</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input type="number" inputMode="decimal" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <CategorySelect
                    value={editCategory}
                    onChange={setEditCategory}
                    type={editingTx.amount >= 0 ? "income" : "expense"}
                    className="h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date <span className="text-muted-foreground">(Reschedule)</span></Label>
                  <Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Account</Label>
                  <AccountSelect value={editAccount} onChange={setEditAccount} enabledAccounts={data.userProfile?.enabledAccounts} className="h-9" />
                </div>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Change the date to reschedule this transaction. All balances will update automatically.
              </p>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={handleSaveEdit} className="w-full h-10">
              Save Changes
            </Button>
            {editingTx?.deletable && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full h-10">
                    <Trash2 className="h-4 w-4 mr-2" /> Cancel Transaction
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Transaction?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove "{editingTx?.name}" and update all balances across the app.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { handleDelete(editingTx!); setEditingTx(null); }}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
