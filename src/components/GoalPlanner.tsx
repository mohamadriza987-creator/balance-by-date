import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, ShoppingBag, CreditCard, ArrowLeft, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import type { AppData, AccountType, Frequency, Goal, OtherAsset, Entry, LiabilityPayoff, Transfer } from "@/lib/finance-types";
import { todayStr, addDays, getNextOccurrence, computeForecast, formatMoney } from "@/lib/finance-utils";

interface GoalPlannerProps {
  data: AppData;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onAddLiabilityPayoff?: (payoff: Omit<LiabilityPayoff, "id">) => void;
  fm: (n: number) => string;
}

type GoalFlowStep = "select_type" | "buy_something" | "pay_off_debt";

const GOAL_SUGGESTIONS = ["iPhone", "Car", "House", "Child Education", "Vacation", "Wedding", "Emergency Fund"];

const DEBT_TYPE_OPTIONS = [
  { value: "Credit Card", label: "Credit Card" },
  { value: "Personal Loan", label: "Personal Loan" },
  { value: "Car Loan", label: "Car Loan" },
  { value: "Other Debt", label: "Other Debt" },
];

const INVESTMENT_TYPES = [
  { value: "FD", label: "Fixed Deposit (FD)" },
  { value: "RD", label: "Recurring Deposit (RD)" },
  { value: "Mutual Funds", label: "Mutual Funds" },
  { value: "Other Investment", label: "Other Investment" },
];

const INVESTMENT_NAME_SUGGESTIONS = ["SIP", "Mutual Fund", "ETF", "Gold Savings", "Private Savings Plan", "Other"];

const CONTRIBUTION_FREQUENCIES: Array<{ value: Frequency; label: string; periodsPerYear: number }> = [
  { value: "monthly", label: "Monthly", periodsPerYear: 12 },
  { value: "quarterly", label: "Quarterly", periodsPerYear: 4 },
  { value: "halfyearly", label: "Half-Yearly", periodsPerYear: 2 },
  { value: "yearly", label: "Yearly", periodsPerYear: 1 },
];

// Compute the average monthly closing balance from forecast
function getMonthlyClosingBalance(data: AppData): number {
  const forecast = computeForecast(data);
  if (forecast.length === 0) return data.currentBalance;

  // Get closing balance at end of each of next 3 months
  const now = new Date();
  const balances: number[] = [];
  for (let m = 1; m <= 3; m++) {
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + m, 0);
    const dateStr = endOfMonth.toISOString().slice(0, 10);
    const items = forecast.filter(f => f.date <= dateStr);
    if (items.length > 0) {
      balances.push(items[items.length - 1].balance);
    }
  }
  if (balances.length === 0) return data.currentBalance;
  return balances.reduce((a, b) => a + b, 0) / balances.length;
}

type Viability = "comfortable" | "tight" | "not_viable";

function assessViability(monthlyPayment: number, freq: Frequency, avgMonthlyBalance: number): { status: Viability; message: string } {
  // Convert payment to monthly equivalent
  const freqData = CONTRIBUTION_FREQUENCIES.find(f => f.value === freq);
  const monthlyEquiv = freqData ? monthlyPayment * freqData.periodsPerYear / 12 : monthlyPayment;
  
  const ratio = monthlyEquiv / Math.max(avgMonthlyBalance, 1);

  if (avgMonthlyBalance <= 0 || ratio > 0.5) {
    return { status: "not_viable", message: "This payment would consume over 50% of your projected balance. Consider a longer timeline or smaller target." };
  }
  if (ratio > 0.25) {
    return { status: "tight", message: "This is feasible but tight — it would take 25-50% of your projected monthly balance. You may want to extend the timeline." };
  }
  return { status: "comfortable", message: "This looks comfortable based on your projected balance. You should be able to manage this easily." };
}

export function GoalPlanner({ data, onAddGoal, onAddOtherAsset, onAddEntry, onAddLiabilityPayoff, fm }: GoalPlannerProps) {
  const [step, setStep] = useState<GoalFlowStep>("select_type");
  const handleBack = () => setStep("select_type");

  const avgBalance = useMemo(() => getMonthlyClosingBalance(data), [data]);

  return (
    <Card className="border-purple-500/20">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-400" />
          Set a Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {step === "select_type" && <GoalTypeSelector onSelect={setStep} />}
        {step === "buy_something" && (
          <BuySomethingForm data={data} onAddGoal={onAddGoal} onAddOtherAsset={onAddOtherAsset} onAddEntry={onAddEntry} onBack={handleBack} fm={fm} avgBalance={avgBalance} />
        )}
        {step === "pay_off_debt" && (
          <PayOffDebtForm data={data} onAddGoal={onAddGoal} onAddEntry={onAddEntry} onAddLiabilityPayoff={onAddLiabilityPayoff} onBack={handleBack} fm={fm} avgBalance={avgBalance} />
        )}
      </CardContent>
    </Card>
  );
}

function GoalTypeSelector({ onSelect }: { onSelect: (step: GoalFlowStep) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground mb-4">What would you like to plan for?</p>
      <Button
        variant="outline"
        className="w-full h-auto py-4 flex items-center gap-4 justify-start border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500/50"
        onClick={() => onSelect("buy_something")}
      >
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shrink-0">
          <ShoppingBag className="h-5 w-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-foreground">Buy Something</p>
          <p className="text-xs text-muted-foreground">Plan for a future purchase or goal</p>
        </div>
      </Button>
      <Button
        variant="outline"
        className="w-full h-auto py-4 flex items-center gap-4 justify-start border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
        onClick={() => onSelect("pay_off_debt")}
      >
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center shrink-0">
          <CreditCard className="h-5 w-5 text-white" />
        </div>
        <div className="text-left">
          <p className="font-semibold text-foreground">Pay Off a Debt</p>
          <p className="text-xs text-muted-foreground">Create a debt payoff plan</p>
        </div>
      </Button>
    </div>
  );
}

// ============ Viability Badge ============
function ViabilityBadge({ status, message }: { status: Viability; message: string }) {
  const config = {
    comfortable: { icon: CheckCircle, label: "Comfortable", cls: "text-success bg-success/10 border-success/30" },
    tight: { icon: AlertTriangle, label: "Tight", cls: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30" },
    not_viable: { icon: XCircle, label: "Not Viable", cls: "text-destructive bg-destructive/10 border-destructive/30" },
  }[status];
  const Icon = config.icon;

  return (
    <div className={`rounded-lg border p-3 ${config.cls}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold">{config.label}</span>
      </div>
      <p className="text-[10px] leading-relaxed opacity-90">{message}</p>
    </div>
  );
}

// ============ BUY SOMETHING ============
function BuySomethingForm({
  data, onAddGoal, onAddOtherAsset, onAddEntry, onBack, fm, avgBalance,
}: {
  data: AppData;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onBack: () => void;
  fm: (n: number) => string;
  avgBalance: number;
}) {
  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [investmentType, setInvestmentType] = useState<string>("RD");
  const [investmentName, setInvestmentName] = useState("");
  const [annualReturn, setAnnualReturn] = useState("6");
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");
  const [contributionFreq, setContributionFreq] = useState<Frequency>("monthly");
  const [sourceAccount, setSourceAccount] = useState<AccountType>("bank");
  const [startDate, setStartDate] = useState(todayStr());
  const [confirmed, setConfirmed] = useState(false);

  const enabledAccounts = data.userProfile?.enabledAccounts || ["cash", "bank"];

  // Live calculation
  const result = useMemo(() => {
    const target = parseFloat(targetAmount);
    const rate = parseFloat(annualReturn || "0") / 100;
    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    if (!target || target <= 0 || totalYears <= 0) return null;

    const freqData = CONTRIBUTION_FREQUENCIES.find(f => f.value === contributionFreq);
    if (!freqData) return null;

    const periodsPerYear = freqData.periodsPerYear;
    const totalPeriods = Math.round(totalYears * periodsPerYear);
    const ratePerPeriod = rate / periodsPerYear;

    let requiredPMT: number;
    if (ratePerPeriod === 0) {
      requiredPMT = target / totalPeriods;
    } else {
      const factor = (Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod;
      requiredPMT = target / factor;
    }

    const totalContrib = requiredPMT * totalPeriods;
    return {
      requiredContribution: requiredPMT,
      totalContributions: totalContrib,
      estimatedReturns: Math.max(0, target - totalContrib),
      maturityValue: target,
      numberOfPeriods: totalPeriods,
    };
  }, [targetAmount, annualReturn, years, months, contributionFreq]);

  const viability = useMemo(() => {
    if (!result) return null;
    return assessViability(result.requiredContribution, contributionFreq, avgBalance);
  }, [result, contributionFreq, avgBalance]);

  const handleStartGoal = () => {
    if (!result || !goalName.trim() || !targetAmount) return;

    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    const targetDate = addDays(startDate, Math.round(totalYears * 365));

    const linkedEntryIds: string[] = [];
    let currentDate = startDate;
    for (let i = 0; i < result.numberOfPeriods; i++) {
      const entryId = onAddEntry({
        label: `Goal: ${goalName.trim()}`,
        amount: -result.requiredContribution,
        date: currentDate,
        frequency: "once",
        category: "Goal Contribution",
        account: sourceAccount,
        includeInForecast: true,
        isOptional: false,
      });
      linkedEntryIds.push(entryId);
      currentDate = getNextOccurrence(currentDate, contributionFreq);
    }

    onAddGoal({
      type: "purchase",
      name: goalName.trim(),
      targetAmount: parseFloat(targetAmount),
      contributionAmount: result.requiredContribution,
      contributionFrequency: contributionFreq,
      startDate,
      targetDate,
      sourceAccount,
      annualReturn: parseFloat(annualReturn),
      vehicle: investmentType as "RD" | "FD" | "Mutual Funds" | "Other Investment",
      vehicleName: investmentType === "Other Investment" ? investmentName : undefined,
      status: "active",
      linkedEntryIds,
    });

    onAddOtherAsset({
      name: goalName.trim(),
      type: investmentType === "FD" ? "FD" : investmentType === "RD" ? "RD" : "Goal Savings",
      typeName: investmentType === "Other Investment" ? investmentName : undefined,
      currentValue: 0,
      contributionAmount: result.requiredContribution,
      contributionFrequency: contributionFreq,
      expectedReturn: parseFloat(annualReturn),
      targetAmount: parseFloat(targetAmount),
      maturityDate: targetDate,
      startDate,
      status: "Active",
      sourceAccount,
    });

    onBack();
  };

  const canStart = goalName.trim() && result && (investmentType !== "Other Investment" || investmentName.trim());
  const freqLabel = CONTRIBUTION_FREQUENCIES.find(f => f.value === contributionFreq)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-2 mb-1">
        <ShoppingBag className="h-5 w-5 text-purple-400" />
        <h3 className="font-semibold">Buy Something</h3>
      </div>

      {!confirmed ? (
        <>
          <div>
            <Label className="text-xs mb-2 block">What is your goal? *</Label>
            <Input value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="e.g., iPhone, Car, House" className="h-9 mb-2" />
            <div className="flex flex-wrap gap-1.5">
              {GOAL_SUGGESTIONS.map(s => (
                <button key={s} onClick={() => setGoalName(s)} className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground">{s}</button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Cost / Target Amount *</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="5000" className="h-9" />
          </div>

          <div>
            <Label className="text-xs">Type of Investment *</Label>
            <Select value={investmentType} onValueChange={setInvestmentType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {investmentType === "Other Investment" && (
            <div>
              <Label className="text-xs">Investment Name *</Label>
              <Input value={investmentName} onChange={(e) => setInvestmentName(e.target.value)} placeholder="e.g., SIP, ETF, Gold Savings" className="h-9 mb-2" />
              <div className="flex flex-wrap gap-1.5">
                {INVESTMENT_NAME_SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => setInvestmentName(s)} className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground">{s}</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Expected Annual Return (%) *</Label>
            <Input type="number" inputMode="decimal" step="0.1" value={annualReturn} onChange={(e) => setAnnualReturn(e.target.value)} placeholder="6" className="h-9" />
          </div>

          <div>
            <Label className="text-xs mb-2 block">Time to achieve this goal? *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Years</Label>
                <Input type="number" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} placeholder="0" className="h-9" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Months</Label>
                <Input type="number" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="0" className="h-9" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Contribution Frequency *</Label>
            <Select value={contributionFreq} onValueChange={(v) => setContributionFreq(v as Frequency)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRIBUTION_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Source Account *</Label>
            <Select value={sourceAccount} onValueChange={(v) => setSourceAccount(v as AccountType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enabledAccounts.filter(a => a !== "creditCard").map(acc => (
                  <SelectItem key={acc} value={acc}>{acc === "cash" ? "Cash" : "Bank"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Start Date *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>

          {/* Live calculation result */}
          {result && (
            <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Required {freqLabel} investment</p>
              </div>
              <p className="text-2xl font-bold text-purple-400">{fm(result.requiredContribution)}</p>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Invest</p>
                  <p className="font-semibold">{fm(result.totalContributions)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Est. Returns</p>
                  <p className="font-semibold text-success">+{fm(result.estimatedReturns)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Maturity</p>
                  <p className="font-semibold">{fm(result.maturityValue)}</p>
                </div>
              </div>

              {viability && <ViabilityBadge status={viability.status} message={viability.message} />}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={onBack} className="flex-1">Cancel</Button>
            <Button
              onClick={() => setConfirmed(true)}
              disabled={!canStart}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600"
            >
              <Target className="h-4 w-4 mr-2" />
              Start Goal
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Confirm your goal</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground mb-0.5">Goal</p><p className="font-bold">{goalName}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Target</p><p className="font-bold">{fm(parseFloat(targetAmount))}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Investment</p><p className="font-bold">{investmentType === "Other Investment" ? investmentName : investmentType}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Return</p><p className="font-bold">{annualReturn}% p.a.</p></div>
              <div><p className="text-muted-foreground mb-0.5">{CONTRIBUTION_FREQUENCIES.find(f=>f.value===contributionFreq)?.label} Payment</p><p className="font-bold text-purple-400">{result ? fm(result.requiredContribution) : "–"}</p></div>
              <div><p className="text-muted-foreground mb-0.5">From</p><p className="font-bold">{sourceAccount === "cash" ? "Cash" : "Bank"}</p></div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmed(false)} className="flex-1">Go Back</Button>
            <Button onClick={handleStartGoal} className="flex-1 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70">
              <CheckCircle className="h-4 w-4 mr-2" /> Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ PAY OFF DEBT ============
function PayOffDebtForm({
  data, onAddGoal, onAddEntry, onAddLiabilityPayoff, onBack, fm, avgBalance,
}: {
  data: AppData;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onAddLiabilityPayoff?: (payoff: Omit<LiabilityPayoff, "id">) => void;
  onBack: () => void;
  fm: (n: number) => string;
  avgBalance: number;
}) {
  const [debtType, setDebtType] = useState("Credit Card");
  const [debtName, setDebtName] = useState("");
  const [outstandingAmount, setOutstandingAmount] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [years, setYears] = useState("");
  const [months, setMonths] = useState("");
  const [paymentFreq, setPaymentFreq] = useState<Frequency>("monthly");
  const [sourceAccount, setSourceAccount] = useState<AccountType>("bank");
  const [startDate, setStartDate] = useState(todayStr());
  const [confirmed, setConfirmed] = useState(false);

  const enabledAccounts = data.userProfile?.enabledAccounts || ["cash", "bank"];

  // Live calculation
  const result = useMemo(() => {
    const principal = parseFloat(outstandingAmount);
    const rate = interestRate ? parseFloat(interestRate) / 100 : 0;
    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    if (!principal || principal <= 0 || totalYears <= 0) return null;

    const freqData = CONTRIBUTION_FREQUENCIES.find(f => f.value === paymentFreq);
    if (!freqData) return null;

    const periodsPerYear = freqData.periodsPerYear;
    const totalPeriods = Math.round(totalYears * periodsPerYear);
    const ratePerPeriod = rate / periodsPerYear;

    let requiredPayment: number;
    if (ratePerPeriod === 0) {
      requiredPayment = principal / totalPeriods;
    } else {
      requiredPayment = principal * (ratePerPeriod * Math.pow(1 + ratePerPeriod, totalPeriods)) / (Math.pow(1 + ratePerPeriod, totalPeriods) - 1);
    }

    return {
      requiredPayment,
      totalPayments: requiredPayment * totalPeriods,
      numberOfPeriods: totalPeriods,
      completionDate: addDays(startDate, Math.round(totalYears * 365)),
    };
  }, [outstandingAmount, interestRate, years, months, paymentFreq, startDate]);

  const viability = useMemo(() => {
    if (!result) return null;
    return assessViability(result.requiredPayment, paymentFreq, avgBalance);
  }, [result, paymentFreq, avgBalance]);

  const handleStartPayoff = () => {
    if (!result || !outstandingAmount) return;

    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    const targetDate = addDays(startDate, Math.round(totalYears * 365));
    const name = debtName.trim() || debtType;

    const linkedEntryIds: string[] = [];
    let currentDate = startDate;
    for (let i = 0; i < result.numberOfPeriods; i++) {
      const entryId = onAddEntry({
        label: `Debt Payoff: ${name}`,
        amount: -result.requiredPayment,
        date: currentDate,
        frequency: "once",
        category: "Debt Payoff",
        account: sourceAccount,
        includeInForecast: true,
        isOptional: false,
      });
      linkedEntryIds.push(entryId);
      currentDate = getNextOccurrence(currentDate, paymentFreq);
    }

    onAddGoal({
      type: "debt_payoff",
      name,
      targetAmount: parseFloat(outstandingAmount),
      contributionAmount: result.requiredPayment,
      contributionFrequency: paymentFreq,
      startDate,
      targetDate,
      sourceAccount,
      annualReturn: 0,
      debtType,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      status: "active",
      linkedEntryIds,
    });

    if (onAddLiabilityPayoff) {
      onAddLiabilityPayoff({
        name,
        originalAmount: parseFloat(outstandingAmount),
        payoffAmount: result.requiredPayment,
        payoffFrequency: paymentFreq,
        startDate,
        targetDate,
        sourceAccount,
        status: "active",
        linkedEntryIds,
      });
    }

    onBack();
  };

  const canStart = (debtName.trim() || debtType !== "Other Debt") && result;
  const freqLabel = CONTRIBUTION_FREQUENCIES.find(f => f.value === paymentFreq)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-2 mb-1">
        <CreditCard className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold">Pay Off a Debt</h3>
      </div>

      {!confirmed ? (
        <>
          <div>
            <Label className="text-xs">What debt do you want to pay off? *</Label>
            <Select value={debtType} onValueChange={setDebtType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DEBT_TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {debtType === "Other Debt" && (
            <div>
              <Label className="text-xs">Debt Name *</Label>
              <Input value={debtName} onChange={(e) => setDebtName(e.target.value)} placeholder="e.g., Home Loan, Education Loan" className="h-9" />
            </div>
          )}

          <div>
            <Label className="text-xs">Outstanding Amount *</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={outstandingAmount} onChange={(e) => setOutstandingAmount(e.target.value)} placeholder="10000" className="h-9" />
          </div>

          <div>
            <Label className="text-xs">Annual Interest Rate (%) <span className="text-muted-foreground text-[10px]">(optional)</span></Label>
            <Input type="number" inputMode="decimal" step="0.1" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="0" className="h-9" />
          </div>

          <div>
            <Label className="text-xs mb-2 block">Time to pay it off? *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Years</Label>
                <Input type="number" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} placeholder="0" className="h-9" />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Months</Label>
                <Input type="number" inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="0" className="h-9" />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Payment Frequency *</Label>
            <Select value={paymentFreq} onValueChange={(v) => setPaymentFreq(v as Frequency)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONTRIBUTION_FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Source Account *</Label>
            <Select value={sourceAccount} onValueChange={(v) => setSourceAccount(v as AccountType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {enabledAccounts.filter(a => a !== "creditCard").map(acc => (
                  <SelectItem key={acc} value={acc}>{acc === "cash" ? "Cash" : "Bank"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Start Date *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>

          {/* Live calculation */}
          {result && (
            <div className="rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30 p-4 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Required {freqLabel} payment</p>
              </div>
              <p className="text-2xl font-bold text-destructive">{fm(result.requiredPayment)}</p>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Total Pay</p>
                  <p className="font-semibold">{fm(result.totalPayments)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Periods</p>
                  <p className="font-semibold">{result.numberOfPeriods}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Done By</p>
                  <p className="font-semibold">{result.completionDate}</p>
                </div>
              </div>

              {viability && <ViabilityBadge status={viability.status} message={viability.message} />}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="ghost" onClick={onBack} className="flex-1">Cancel</Button>
            <Button
              onClick={() => setConfirmed(true)}
              disabled={!canStart}
              className="flex-1 bg-gradient-to-r from-destructive to-destructive/80"
            >
              <Target className="h-4 w-4 mr-2" />
              Start Payoff
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30 p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Confirm your payoff plan</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><p className="text-muted-foreground mb-0.5">Debt</p><p className="font-bold">{debtName || debtType}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Amount</p><p className="font-bold">{fm(parseFloat(outstandingAmount))}</p></div>
              <div><p className="text-muted-foreground mb-0.5">{CONTRIBUTION_FREQUENCIES.find(f=>f.value===paymentFreq)?.label} Payment</p><p className="font-bold text-destructive">{result ? fm(result.requiredPayment) : "–"}</p></div>
              <div><p className="text-muted-foreground mb-0.5">From</p><p className="font-bold">{sourceAccount === "cash" ? "Cash" : "Bank"}</p></div>
              <div><p className="text-muted-foreground mb-0.5">Completion</p><p className="font-bold">{result?.completionDate || "–"}</p></div>
              {interestRate && <div><p className="text-muted-foreground mb-0.5">Interest</p><p className="font-bold">{interestRate}% p.a.</p></div>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirmed(false)} className="flex-1">Go Back</Button>
            <Button onClick={handleStartPayoff} className="flex-1 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70">
              <CheckCircle className="h-4 w-4 mr-2" /> Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
