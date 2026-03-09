import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, TrendingUp, Target, CreditCard, ListFilter, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet } from "lucide-react";
import type { AppData, OtherAsset, OtherAssetType, Entry, Subscription, Transfer, Goal, LiabilityPayoff, Frequency } from "@/lib/finance-types";
import { formatMoney, formatDate, todayStr, addDays, daysBetween, getNextOccurrence } from "@/lib/finance-utils";

interface OtherAssetsTabProps {
  data: AppData;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onRemoveOtherAsset: (id: string) => void;
}

const ACCOUNT_LABELS: Record<string, string> = {
  cash: "Cash",
  bank: "Bank",
  creditCard: "Credit Card",
};

export function OtherAssetsTab({ data, onAddOtherAsset, onRemoveOtherAsset }: OtherAssetsTabProps) {
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);
  const positionDate = data.positionDate || todayStr();

  return (
    <div className="space-y-6">
      {/* Section 1: Other Assets */}
      <OtherAssetsSection 
        data={data} 
        positionDate={positionDate} 
        fm={fm} 
        onAddOtherAsset={onAddOtherAsset}
        onRemoveOtherAsset={onRemoveOtherAsset}
      />

      {/* Section 2: Liability Payoff */}
      <LiabilityPayoffSection data={data} positionDate={positionDate} fm={fm} />

      {/* Section 3: All Transactions */}
      <AllTransactionsSection data={data} fm={fm} />
    </div>
  );
}

// ============ SECTION 1: OTHER ASSETS ============
function OtherAssetsSection({ 
  data, 
  positionDate, 
  fm, 
  onAddOtherAsset,
  onRemoveOtherAsset 
}: { 
  data: AppData; 
  positionDate: string; 
  fm: (n: number) => string;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onRemoveOtherAsset: (id: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);

  // Calculate values as of position date
  const assetsWithCalculations = useMemo(() => {
    return data.otherAssets.map(asset => {
      const calc = calculateAssetValueAtDate(asset, positionDate, data);
      return { ...asset, ...calc };
    });
  }, [data.otherAssets, positionDate, data]);

  const totalValue = assetsWithCalculations.reduce((sum, a) => sum + a.currentValueAtDate, 0);
  const goalLinkedAssets = assetsWithCalculations.filter(a => a.linkedGoalId);
  const manualAssets = assetsWithCalculations.filter(a => !a.linkedGoalId);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
        <TrendingUp className="h-4 w-4 text-purple-400" />
        Other Assets
      </h2>

      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Other Assets (as of {formatDate(positionDate)})</p>
              <p className="text-2xl font-bold text-foreground">{fm(totalValue)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Not included in available balance</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </CardContent>
      </Card>

      {goalLinkedAssets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">GOAL-LINKED ASSETS ({goalLinkedAssets.length})</p>
          {goalLinkedAssets.map(asset => (
            <OtherAssetCard key={asset.id} asset={asset} fm={fm} onRemove={onRemoveOtherAsset} />
          ))}
        </div>
      )}

      {manualAssets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">MANUAL ASSETS ({manualAssets.length})</p>
          {manualAssets.map(asset => (
            <OtherAssetCard key={asset.id} asset={asset} fm={fm} onRemove={onRemoveOtherAsset} />
          ))}
        </div>
      )}

      {!showForm && (
        <Button className="w-full" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Other Asset Manually
        </Button>
      )}

      {showForm && (
        <AddOtherAssetForm
          onAdd={(asset) => {
            onAddOtherAsset(asset);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          fm={fm}
        />
      )}

      {data.otherAssets.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No other assets yet</p>
            <p className="text-xs text-muted-foreground mt-1">Start a goal in the Forecast tab to create goal-linked assets</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface AssetCalculation {
  currentValueAtDate: number;
  totalContributionMade: number;
  profitMade: number;
  remaining: number;
  progress: number;
}

function calculateAssetValueAtDate(asset: OtherAsset, positionDate: string, data: AppData): AssetCalculation {
  // Count contributions made up to position date
  let contributions = 0;
  let currentDate = asset.startDate;
  
  while (currentDate <= positionDate && (!asset.maturityDate || currentDate <= asset.maturityDate)) {
    contributions += asset.contributionAmount;
    currentDate = getNextOccurrence(currentDate, asset.contributionFrequency);
  }

  // Calculate compounded growth
  const daysSinceStart = Math.max(0, daysBetween(asset.startDate, positionDate));
  const yearsSinceStart = daysSinceStart / 365;
  const rate = asset.expectedReturn / 100;
  
  // Simple compound interest approximation on contributions
  const periodsPerYear = getPeriodsPerYear(asset.contributionFrequency);
  const ratePerPeriod = rate / periodsPerYear;
  const numContributions = Math.floor(contributions / asset.contributionAmount) || 0;
  
  let accumulatedValue = 0;
  for (let i = 0; i < numContributions; i++) {
    const periodsRemaining = numContributions - i;
    accumulatedValue += asset.contributionAmount * Math.pow(1 + ratePerPeriod, periodsRemaining);
  }

  const currentValueAtDate = Math.max(asset.currentValue, accumulatedValue);
  const totalContributionMade = contributions;
  const profitMade = Math.max(0, currentValueAtDate - totalContributionMade);
  const remaining = asset.targetAmount ? Math.max(0, asset.targetAmount - currentValueAtDate) : 0;
  const progress = asset.targetAmount ? Math.min(100, Math.round((currentValueAtDate / asset.targetAmount) * 100)) : 0;

  return { currentValueAtDate, totalContributionMade, profitMade, remaining, progress };
}

function getPeriodsPerYear(freq: Frequency): number {
  switch (freq) {
    case "monthly": return 12;
    case "quarterly": return 4;
    case "halfyearly": return 2;
    case "yearly": return 1;
    default: return 12;
  }
}

function OtherAssetCard({ 
  asset, 
  fm, 
  onRemove 
}: { 
  asset: OtherAsset & AssetCalculation; 
  fm: (n: number) => string; 
  onRemove: (id: string) => void;
}) {
  const isGoalLinked = !!asset.linkedGoalId;
  const monthsLeft = asset.maturityDate ? Math.max(0, Math.round(daysBetween(todayStr(), asset.maturityDate) / 30)) : null;

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      case "halfyearly": return "Half-Yearly";
      case "yearly": return "Yearly";
      default: return "Monthly";
    }
  };

  return (
    <Card className="border-purple-500/20">
      <CardContent className="px-4 py-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-medium">{asset.name}</p>
              <Badge variant="outline" className="text-[9px]">
                {asset.typeName || asset.type}
              </Badge>
              <Badge className={`text-[9px] ${
                asset.status === "Active" ? "bg-success/20 text-success border-success/30" :
                asset.status === "Completed" ? "bg-primary/20 text-primary border-primary/30" :
                "bg-muted text-muted-foreground border-border"
              }`}>{asset.status}</Badge>
              {isGoalLinked && <Badge className="text-[9px] bg-purple-500/20 text-purple-400 border-purple-500/30">Goal-Linked</Badge>}
            </div>
            {asset.sourceAccount && (
              <p className="text-[10px] text-muted-foreground">Source: {ACCOUNT_LABELS[asset.sourceAccount]}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onRemove(asset.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">Current Value</p>
            <p className="font-bold text-base">{fm(asset.currentValueAtDate)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">{getFrequencyLabel(asset.contributionFrequency)} Contribution</p>
            <p className="font-bold text-success">{fm(asset.contributionAmount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Total Contributed</p>
            <p className="font-bold">{fm(asset.totalContributionMade)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Profit Made</p>
            <p className="font-bold text-success">+{fm(asset.profitMade)}</p>
          </div>
          {asset.expectedReturn > 0 && (
            <div>
              <p className="text-muted-foreground mb-0.5">Expected Return</p>
              <p className="font-bold">{asset.expectedReturn}% p.a.</p>
            </div>
          )}
          {asset.maturityDate && (
            <div>
              <p className="text-muted-foreground mb-0.5">Maturity Date</p>
              <p className="font-bold">{formatDate(asset.maturityDate)}</p>
            </div>
          )}
        </div>

        {asset.targetAmount && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress to Target</span>
              <span className="font-medium">{asset.progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${asset.progress}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Target: {fm(asset.targetAmount)}</span>
              {asset.remaining > 0 && <span className="text-warning font-medium">{fm(asset.remaining)} to go</span>}
            </div>
            {monthsLeft !== null && monthsLeft > 0 && (
              <p className="text-[10px] text-muted-foreground">Approximately {monthsLeft} month{monthsLeft !== 1 ? "s" : ""} remaining</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddOtherAssetForm({ onAdd, onCancel, fm }: {
  onAdd: (asset: Omit<OtherAsset, "id">) => void;
  onCancel: () => void;
  fm: (n: number) => string;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<OtherAssetType>("Other");
  const [typeName, setTypeName] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionFreq, setContributionFreq] = useState<Frequency>("monthly");
  const [expectedReturn, setExpectedReturn] = useState("0");
  const [targetAmount, setTargetAmount] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentValue) return;

    onAdd({
      name: name.trim(),
      type,
      typeName: type === "Other" ? typeName : undefined,
      currentValue: parseFloat(currentValue) || 0,
      contributionAmount: parseFloat(contributionAmount) || 0,
      contributionFrequency: contributionFreq,
      expectedReturn: parseFloat(expectedReturn) || 0,
      targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
      maturityDate: maturityDate || undefined,
      startDate: todayStr(),
      status: "Active",
    });
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Add Other Asset</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Asset Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as OtherAssetType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RD">Recurring Deposit (RD)</SelectItem>
                <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
                <SelectItem value="Goal Savings">Goal Savings</SelectItem>
                <SelectItem value="Emergency Fund">Emergency Fund</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "Other" && (
            <div>
              <Label className="text-xs">Type Name</Label>
              <Input value={typeName} onChange={e => setTypeName(e.target.value)} placeholder="e.g. SIP, ETF" className="h-9" />
            </div>
          )}
          <div>
            <Label className="text-xs">Current Value *</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0.00" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Contribution Amount</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={contributionAmount} onChange={e => setContributionAmount(e.target.value)} placeholder="0.00" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Contribution Frequency</Label>
            <Select value={contributionFreq} onValueChange={(v) => setContributionFreq(v as Frequency)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="halfyearly">Half-Yearly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Expected Return (%)</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} placeholder="0" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Target Amount (optional)</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="Optional" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Maturity Date (optional)</Label>
            <Input type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} className="h-9" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={!name.trim() || !currentValue}>Add Asset</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============ SECTION 2: LIABILITY PAYOFF ============
function LiabilityPayoffSection({ data, positionDate, fm }: { data: AppData; positionDate: string; fm: (n: number) => string }) {
  // Get debt payoff goals and liability payoffs
  const debtPayoffGoals = data.goals.filter(g => g.type === "debt_payoff");
  const liabilityPayoffs = data.liabilityPayoffs || [];

  const allLiabilities = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      originalAmount: number;
      paidAmount: number;
      remainingAmount: number;
      payoffAmount: number;
      frequency: Frequency;
      startDate: string;
      targetDate: string;
      status: string;
      type: "goal" | "payoff";
    }> = [];

    // Add debt payoff goals
    debtPayoffGoals.forEach(goal => {
      const paidAmount = calculatePaidAmount(goal, positionDate, data);
      items.push({
        id: goal.id,
        name: goal.name,
        originalAmount: goal.targetAmount,
        paidAmount,
        remainingAmount: Math.max(0, goal.targetAmount - paidAmount),
        payoffAmount: goal.contributionAmount,
        frequency: goal.contributionFrequency,
        startDate: goal.startDate,
        targetDate: goal.targetDate,
        status: paidAmount >= goal.targetAmount ? "Completed" : "Active",
        type: "goal",
      });
    });

    // Add liability payoffs that DON'T already have a matching goal
    const goalLinkedEntryIds = new Set(debtPayoffGoals.flatMap(g => g.linkedEntryIds || []));
    liabilityPayoffs.forEach(payoff => {
      // Skip if this payoff shares linkedEntryIds with a goal (same debt)
      const isAlreadyCoveredByGoal = (payoff.linkedEntryIds || []).some(id => goalLinkedEntryIds.has(id));
      if (isAlreadyCoveredByGoal) return;

      const paidAmount = calculateLiabilityPaidAmount(payoff, positionDate, data);
      items.push({
        id: payoff.id,
        name: payoff.name,
        originalAmount: payoff.originalAmount,
        paidAmount,
        remainingAmount: Math.max(0, payoff.originalAmount - paidAmount),
        payoffAmount: payoff.payoffAmount,
        frequency: payoff.payoffFrequency,
        startDate: payoff.startDate,
        targetDate: payoff.targetDate,
        status: paidAmount >= payoff.originalAmount ? "Completed" : payoff.status === "active" ? "Active" : "Paused",
        type: "payoff",
      });
    });

    return items;
  }, [debtPayoffGoals, liabilityPayoffs, positionDate, data]);

  if (allLiabilities.length === 0) {
    return (
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
          <CreditCard className="h-4 w-4 text-orange-400" />
          Liability Payoff
        </h2>
        <Card>
          <CardContent className="p-6 text-center">
            <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No liability payoff plans</p>
            <p className="text-xs text-muted-foreground mt-1">Create a debt payoff goal in the Forecast tab</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      case "halfyearly": return "Half-Yearly";
      case "yearly": return "Yearly";
      default: return "Monthly";
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
        <CreditCard className="h-4 w-4 text-orange-400" />
        Liability Payoff
      </h2>

      {allLiabilities.map(liability => (
        <Card key={liability.id} className="border-orange-500/20">
          <CardContent className="px-4 py-3 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-sm font-medium">{liability.name}</p>
                  <Badge className={`text-[9px] ${
                    liability.status === "Active" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
                    liability.status === "Completed" ? "bg-success/20 text-success border-success/30" :
                    "bg-muted text-muted-foreground border-border"
                  }`}>{liability.status}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Original Amount</p>
                <p className="font-bold">{fm(liability.originalAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Amount Paid</p>
                <p className="font-bold text-success">{fm(liability.paidAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Remaining Balance</p>
                <p className="font-bold text-orange-400">{fm(liability.remainingAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">{getFrequencyLabel(liability.frequency)} Payment</p>
                <p className="font-bold">{fm(liability.payoffAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Start Date</p>
                <p className="font-bold">{formatDate(liability.startDate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Target Completion</p>
                <p className="font-bold">{formatDate(liability.targetDate)}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Payoff Progress</span>
                <span className="font-medium">{Math.round((liability.paidAmount / liability.originalAmount) * 100)}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, (liability.paidAmount / liability.originalAmount) * 100)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function calculatePaidAmount(goal: Goal, positionDate: string, data: AppData): number {
  // Count contributions made up to position date
  let paid = 0;
  let currentDate = goal.startDate;
  
  while (currentDate <= positionDate && currentDate <= goal.targetDate) {
    paid += goal.contributionAmount;
    currentDate = getNextOccurrence(currentDate, goal.contributionFrequency);
  }
  
  return Math.min(paid, goal.targetAmount);
}

function calculateLiabilityPaidAmount(payoff: LiabilityPayoff, positionDate: string, data: AppData): number {
  let paid = 0;
  let currentDate = payoff.startDate;
  
  while (currentDate <= positionDate && currentDate <= payoff.targetDate) {
    paid += payoff.payoffAmount;
    currentDate = getNextOccurrence(currentDate, payoff.payoffFrequency);
  }
  
  return Math.min(paid, payoff.originalAmount);
}

// ============ SECTION 3: ALL TRANSACTIONS ============
function AllTransactionsSection({ data, fm }: { data: AppData; fm: (n: number) => string }) {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(todayStr());

  const transactions = useMemo(() => {
    const items: Array<{
      id: string;
      date: string;
      name: string;
      amount: number;
      balance: number;
      source: string;
      type: "inflow" | "outflow" | "transfer" | "goal_contribution" | "liability_payoff" | "cc_settlement";
    }> = [];

    // Process entries (skip Debt Payoff — already shown in Liability Payoff section)
    data.entries.forEach(entry => {
      if (entry.category === "Debt Payoff") return;
      if (entry.date >= fromDate && entry.date <= toDate) {
        items.push({
          id: entry.id,
          date: entry.date,
          name: entry.label,
          amount: entry.amount,
          balance: 0,
          source: ACCOUNT_LABELS[entry.account] || entry.account,
          type: entry.amount >= 0 ? "inflow" : 
                entry.category === "Goal Contribution" ? "goal_contribution" :
                entry.category === "Debt" ? "liability_payoff" : "outflow",
        });
      }
    });

    // Process subscriptions (generate occurrences)
    data.subscriptions.forEach(sub => {
      let currentDate = sub.nextDate;
      while (currentDate <= toDate) {
        if (currentDate >= fromDate) {
          items.push({
            id: `${sub.id}-${currentDate}`,
            date: currentDate,
            name: sub.name,
            amount: -sub.amount,
            balance: 0,
            source: ACCOUNT_LABELS[sub.account] || sub.account,
            type: "outflow",
          });
        }
        currentDate = getNextOccurrence(currentDate, sub.frequency);
        if (sub.frequency === "once") break;
      }
    });

    // Process transfers
    (data.transfers || []).forEach(transfer => {
      if (transfer.date >= fromDate && transfer.date <= toDate && transfer.isApplied) {
        items.push({
          id: transfer.id,
          date: transfer.date,
          name: transfer.reason || `${ACCOUNT_LABELS[transfer.fromAccount]} → ${ACCOUNT_LABELS[transfer.toAccount]}`,
          amount: transfer.amount,
          balance: 0,
          source: `${ACCOUNT_LABELS[transfer.fromAccount]} → ${ACCOUNT_LABELS[transfer.toAccount]}`,
          type: transfer.toAccount === "creditCard" ? "cc_settlement" : "transfer",
        });
      }
    });

    // Sort by date descending
    items.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);

    // Calculate running balances
    let balance = data.currentBalance;
    const itemsReversed = [...items].reverse();
    for (const item of itemsReversed) {
      balance += item.amount;
      item.balance = balance;
    }

    return items;
  }, [data, fromDate, toDate]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "inflow": return <ArrowDownLeft className="h-3 w-3 text-success" />;
      case "outflow": return <ArrowUpRight className="h-3 w-3 text-destructive" />;
      case "transfer": return <ArrowLeftRight className="h-3 w-3 text-primary" />;
      case "goal_contribution": return <Target className="h-3 w-3 text-purple-400" />;
      case "liability_payoff": return <CreditCard className="h-3 w-3 text-orange-400" />;
      case "cc_settlement": return <Wallet className="h-3 w-3 text-blue-400" />;
      default: return null;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "inflow": return <Badge className="text-[8px] bg-success/20 text-success border-success/30">Inflow</Badge>;
      case "outflow": return <Badge className="text-[8px] bg-destructive/20 text-destructive border-destructive/30">Outflow</Badge>;
      case "transfer": return <Badge className="text-[8px] bg-primary/20 text-primary border-primary/30">Transfer</Badge>;
      case "goal_contribution": return <Badge className="text-[8px] bg-purple-500/20 text-purple-400 border-purple-500/30">Goal</Badge>;
      case "liability_payoff": return <Badge className="text-[8px] bg-orange-500/20 text-orange-400 border-orange-500/30">Payoff</Badge>;
      case "cc_settlement": return <Badge className="text-[8px] bg-blue-500/20 text-blue-400 border-blue-500/30">CC Settlement</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 px-1">
        <ListFilter className="h-4 w-4 text-primary" />
        All Transactions
      </h2>

      <Card>
        <CardContent className="px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">From Date</Label>
              <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="h-9" />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="h-9" />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{transactions.length} transaction{transactions.length !== 1 ? "s" : ""} found</p>
        </CardContent>
      </Card>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <ListFilter className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">No transactions in this period</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {transactions.map(tx => (
            <Card key={tx.id}>
              <CardContent className="px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <div className="mt-1">{getTypeIcon(tx.type)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{tx.name}</p>
                        {getTypeBadge(tx.type)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatDate(tx.date)}</p>
                      <p className="text-[10px] text-muted-foreground">{tx.source}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${tx.amount >= 0 ? "text-success" : "text-destructive"}`}>
                      {tx.amount >= 0 ? "+" : ""}{fm(tx.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">({fm(tx.balance)})</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
