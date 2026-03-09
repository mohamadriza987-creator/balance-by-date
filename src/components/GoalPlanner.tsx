import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Target, CreditCard as DebtIcon, TrendingUp, AlertCircle } from "lucide-react";
import type { AppData, Goal, AccountType, OtherAsset } from "@/lib/finance-types";
import { todayStr, formatMoney, formatDate, addDays, daysBetween } from "@/lib/finance-utils";

interface GoalPlannerProps {
  data: AppData;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  fm: (n: number) => string;
}

export function GoalPlanner({ data, onAddGoal, onAddOtherAsset, fm }: GoalPlannerProps) {
  const [goalType, setGoalType] = useState<"purchase" | "debt_payoff">("purchase");
  const [showForm, setShowForm] = useState(false);

  if (!showForm) {
    return (
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Set a Goal
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">Plan for a purchase or pay off debt</p>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { setGoalType("purchase"); setShowForm(true); }}>
            <TrendingUp className="h-4 w-4" /> Buy Something
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { setGoalType("debt_payoff"); setShowForm(true); }}>
            <DebtIcon className="h-4 w-4" /> Pay Off a Debt
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {goalType === "purchase" ? <TrendingUp className="h-4 w-4" /> : <DebtIcon className="h-4 w-4" />}
            {goalType === "purchase" ? "Buy Something Goal" : "Debt Payoff Goal"}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {goalType === "purchase" ? (
          <PurchaseGoalForm data={data} onAddGoal={onAddGoal} onAddOtherAsset={onAddOtherAsset} fm={fm} onClose={() => setShowForm(false)} />
        ) : (
          <DebtPayoffForm data={data} onAddGoal={onAddGoal} fm={fm} onClose={() => setShowForm(false)} />
        )}
      </CardContent>
    </Card>
  );
}

function PurchaseGoalForm({ data, onAddGoal, onAddOtherAsset, fm, onClose }: {
  data: AppData; onAddGoal: (g: Omit<Goal, "id">) => void; onAddOtherAsset: (a: Omit<OtherAsset, "id">) => void; fm: (n: number) => string; onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState(addDays(todayStr(), 365));
  const [vehicle, setVehicle] = useState<"RD" | "FD" | "Other">("RD");
  const [annualReturn, setAnnualReturn] = useState([7]);
  const [sourceAccount, setSourceAccount] = useState<AccountType>("bank");
  const [startDate, setStartDate] = useState(todayStr());
  const [calculated, setCalculated] = useState(false);

  const calculation = useMemo(() => {
    if (!targetAmount || !targetDate || !startDate) return null;
    const target = parseFloat(targetAmount);
    const months = Math.max(1, Math.round(daysBetween(startDate, targetDate) / 30));
    const r = annualReturn[0] / 100 / 12;

    let monthly = 0;
    if (r > 0.0001) {
      monthly = (target * r) / (Math.pow(1 + r, months) - 1);
    } else {
      monthly = target / months;
    }

    const maturityValue = monthly * ((Math.pow(1 + r, months) - 1) / r);
    const feasible = monthly < (data.currentBalance * 0.2);

    return { monthly: Math.ceil(monthly * 100) / 100, months, maturityValue, feasible };
  }, [targetAmount, targetDate, startDate, annualReturn, data.currentBalance]);

  const handleStart = () => {
    if (!calculation || !name.trim() || !targetAmount) return;

    const goal: Omit<Goal, "id"> = {
      type: "purchase",
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      monthlyAmount: calculation.monthly,
      startDate,
      targetDate,
      sourceAccount,
      annualReturn: annualReturn[0],
      vehicle,
      status: "active",
    };

    const asset: Omit<OtherAsset, "id"> = {
      name: `${vehicle} - ${name}`,
      type: vehicle === "RD" ? "RD" : vehicle === "FD" ? "FD" : "Goal Savings",
      currentValue: 0,
      monthlyContribution: calculation.monthly,
      expectedReturn: annualReturn[0],
      targetAmount: parseFloat(targetAmount),
      maturityDate: targetDate,
      startDate,
      status: "Active",
    };

    onAddGoal(goal);
    onAddOtherAsset(asset);
    onClose();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Item / Goal Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. iPhone, Car, Vacation" className="h-9" />
      </div>
      <div>
        <Label className="text-xs">Target Price *</Label>
        <Input type="number" inputMode="decimal" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="0.00" className="h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Start Date *</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Target Date *</Label>
          <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Savings Vehicle *</Label>
        <Select value={vehicle} onValueChange={(v) => setVehicle(v as "RD" | "FD" | "Other")}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="RD">Recurring Deposit (RD)</SelectItem>
            <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
            <SelectItem value="Other">Other Investment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Expected Annual Return</Label>
        <div className="flex items-center gap-3 mt-2">
          <Slider value={annualReturn} onValueChange={setAnnualReturn} min={0} max={20} step={0.5} className="flex-1" />
          <span className="text-sm font-medium w-12 text-right">{annualReturn[0]}%</span>
        </div>
      </div>
      <div>
        <Label className="text-xs">Source Account *</Label>
        <Select value={sourceAccount} onValueChange={(v) => setSourceAccount(v as AccountType)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank">Bank</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" className="w-full" onClick={() => setCalculated(true)} disabled={!name.trim() || !targetAmount || !calculation}>
        Calculate Required Contribution
      </Button>

      {calculated && calculation && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-primary">📊 Goal Calculation</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Target Amount</p>
              <p className="font-bold">{fm(parseFloat(targetAmount))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Expected Return</p>
              <p className="font-bold">{annualReturn[0]}% p.a.</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Required Monthly</p>
              <p className="font-bold text-lg text-primary">{fm(calculation.monthly)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Duration</p>
              <p className="font-bold">{calculation.months} months</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Maturity Value</p>
              <p className="font-bold text-success">{fm(calculation.maturityValue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Feasibility</p>
              <p className={`font-bold ${calculation.feasible ? "text-success" : "text-warning"}`}>
                {calculation.feasible ? "✓ Looks good" : "⚠ Tight"}
              </p>
            </div>
          </div>
          {!calculation.feasible && (
            <div className="flex items-start gap-2 rounded bg-warning/10 border border-warning/20 p-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">This monthly amount may strain your cash flow. Consider extending the timeline.</p>
            </div>
          )}
          <Button className="w-full bg-primary hover:bg-primary/90" onClick={handleStart}>
            Start This Goal
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            This will create a recurring {fm(calculation.monthly)} monthly contribution from {sourceAccount === "cash" ? "Cash" : "Bank"} into Other Assets.
          </p>
        </div>
      )}
    </div>
  );
}

function DebtPayoffForm({ data, onAddGoal, fm, onClose }: {
  data: AppData; onAddGoal: (g: Omit<Goal, "id">) => void; fm: (n: number) => string; onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [debtType, setDebtType] = useState("Credit Card");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [targetDate, setTargetDate] = useState(addDays(todayStr(), 365));
  const [sourceAccount, setSourceAccount] = useState<AccountType>("bank");
  const [startDate, setStartDate] = useState(todayStr());
  const [interestRate, setInterestRate] = useState("0");
  const [calculated, setCalculated] = useState(false);

  const calculation = useMemo(() => {
    if (!outstandingAmount || !targetDate || !startDate) return null;
    const principal = parseFloat(outstandingAmount);
    const months = Math.max(1, Math.round(daysBetween(startDate, targetDate) / 30));
    const r = parseFloat(interestRate) / 100 / 12;

    let monthly = 0;
    if (r > 0.0001) {
      monthly = (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    } else {
      monthly = principal / months;
    }

    const totalPaid = monthly * months;
    const feasible = monthly < (data.currentBalance * 0.3);

    return { monthly: Math.ceil(monthly * 100) / 100, months, totalPaid, feasible };
  }, [outstandingAmount, targetDate, startDate, interestRate, data.currentBalance]);

  const handleStart = () => {
    if (!calculation || !name.trim() || !outstandingAmount) return;

    const goal: Omit<Goal, "id"> = {
      type: "debt_payoff",
      name: name.trim() || `${debtType} Payoff`,
      targetAmount: parseFloat(outstandingAmount),
      monthlyAmount: calculation.monthly,
      startDate,
      targetDate,
      sourceAccount,
      annualReturn: 0,
      debtType,
      interestRate: parseFloat(interestRate),
      status: "active",
    };

    onAddGoal(goal);
    onClose();
  };

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Debt Name (optional)</Label>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Car Loan" className="h-9" />
      </div>
      <div>
        <Label className="text-xs">Debt Type *</Label>
        <Select value={debtType} onValueChange={setDebtType}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Credit Card">Credit Card</SelectItem>
            <SelectItem value="Personal Loan">Personal Loan</SelectItem>
            <SelectItem value="Car Loan">Car Loan</SelectItem>
            <SelectItem value="Home Loan">Home Loan</SelectItem>
            <SelectItem value="Other">Other Debt</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-xs">Outstanding Amount *</Label>
        <Input type="number" inputMode="decimal" step="0.01" value={outstandingAmount} onChange={e => setOutstandingAmount(e.target.value)} placeholder="0.00" className="h-9" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Start Date *</Label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-9" />
        </div>
        <div>
          <Label className="text-xs">Payoff By *</Label>
          <Input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="h-9" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Interest Rate (% p.a., optional)</Label>
        <Input type="number" inputMode="decimal" step="0.1" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="0" className="h-9" />
      </div>
      <div>
        <Label className="text-xs">Source Account *</Label>
        <Select value={sourceAccount} onValueChange={(v) => setSourceAccount(v as AccountType)}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bank">Bank</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" className="w-full" onClick={() => setCalculated(true)} disabled={!outstandingAmount || !calculation}>
        Calculate Monthly Payment
      </Button>

      {calculated && calculation && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-orange-400">📊 Payoff Plan</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Total Debt</p>
              <p className="font-bold">{fm(parseFloat(outstandingAmount))}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Interest Rate</p>
              <p className="font-bold">{interestRate}% p.a.</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Monthly Payment</p>
              <p className="font-bold text-lg text-orange-400">{fm(calculation.monthly)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Duration</p>
              <p className="font-bold">{calculation.months} months</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Total Paid</p>
              <p className="font-bold">{fm(calculation.totalPaid)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Feasibility</p>
              <p className={`font-bold ${calculation.feasible ? "text-success" : "text-warning"}`}>
                {calculation.feasible ? "✓ Manageable" : "⚠ Aggressive"}
              </p>
            </div>
          </div>
          {!calculation.feasible && (
            <div className="flex items-start gap-2 rounded bg-warning/10 border border-warning/20 p-2">
              <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-warning">This payment plan may be too aggressive for your current surplus. Consider extending the timeline.</p>
            </div>
          )}
          <Button className="w-full bg-orange-500 hover:bg-orange-500/90" onClick={handleStart}>
            Start Payoff Plan
          </Button>
          <p className="text-[10px] text-muted-foreground text-center">
            This will create a recurring {fm(calculation.monthly)} monthly outflow from {sourceAccount === "cash" ? "Cash" : "Bank"} toward debt reduction.
          </p>
        </div>
      )}
    </div>
  );
}
