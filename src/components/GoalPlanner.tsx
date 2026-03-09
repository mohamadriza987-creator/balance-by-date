import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, TrendingUp, Calculator, ShoppingBag, CreditCard, ArrowLeft } from "lucide-react";
import type { AppData, AccountType, Frequency, Goal, OtherAsset, Entry, LiabilityPayoff } from "@/lib/finance-types";
import { todayStr, addDays, getNextOccurrence } from "@/lib/finance-utils";

interface GoalPlannerProps {
  data: AppData;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onAddLiabilityPayoff?: (payoff: Omit<LiabilityPayoff, "id">) => void;
  fm: (n: number) => string;
}

type GoalFlowStep = "select_type" | "buy_something" | "pay_off_debt";

const GOAL_SUGGESTIONS = [
  "iPhone",
  "Car",
  "House",
  "Child Education",
  "Vacation",
  "Wedding",
  "Emergency Fund",
];

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

const INVESTMENT_NAME_SUGGESTIONS = [
  "SIP",
  "Mutual Fund",
  "ETF",
  "Gold Savings",
  "Private Savings Plan",
  "Other",
];

const CONTRIBUTION_FREQUENCIES: Array<{ value: Frequency; label: string; periodsPerYear: number }> = [
  { value: "monthly", label: "Monthly", periodsPerYear: 12 },
  { value: "quarterly", label: "Quarterly", periodsPerYear: 4 },
  { value: "halfyearly", label: "Half-Yearly", periodsPerYear: 2 },
  { value: "yearly", label: "Yearly", periodsPerYear: 1 },
];

export function GoalPlanner({ data, onAddGoal, onAddOtherAsset, onAddEntry, onAddLiabilityPayoff, fm }: GoalPlannerProps) {
  const [step, setStep] = useState<GoalFlowStep>("select_type");

  const handleBack = () => setStep("select_type");

  return (
    <Card className="border-purple-500/20">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-purple-400" />
          Set a Goal
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {step === "select_type" && (
          <GoalTypeSelector onSelect={setStep} />
        )}
        {step === "buy_something" && (
          <BuySomethingForm
            data={data}
            onAddGoal={onAddGoal}
            onAddOtherAsset={onAddOtherAsset}
            onAddEntry={onAddEntry}
            onBack={handleBack}
            fm={fm}
          />
        )}
        {step === "pay_off_debt" && (
          <PayOffDebtForm
            data={data}
            onAddGoal={onAddGoal}
            onAddEntry={onAddEntry}
            onAddLiabilityPayoff={onAddLiabilityPayoff}
            onBack={handleBack}
            fm={fm}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ============ STEP 1: GOAL TYPE SELECTOR ============
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

// ============ STEP 2A: BUY SOMETHING FORM ============
interface BuyCalculationResult {
  requiredContribution: number;
  totalContributions: number;
  estimatedReturns: number;
  maturityValue: number;
  numberOfPeriods: number;
}

function BuySomethingForm({
  data,
  onAddGoal,
  onAddOtherAsset,
  onAddEntry,
  onBack,
  fm,
}: {
  data: AppData;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onBack: () => void;
  fm: (n: number) => string;
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
  const [calculated, setCalculated] = useState(false);

  const enabledAccounts = data.userProfile?.enabledAccounts || ["cash", "bank"];

  const result = useMemo<BuyCalculationResult | null>(() => {
    if (!calculated || !targetAmount || !annualReturn || (!years && !months)) return null;

    const target = parseFloat(targetAmount);
    const rate = parseFloat(annualReturn) / 100;
    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    
    if (target <= 0 || totalYears <= 0) return null;

    const freqData = CONTRIBUTION_FREQUENCIES.find((f) => f.value === contributionFreq);
    if (!freqData) return null;

    const periodsPerYear = freqData.periodsPerYear;
    const totalPeriods = Math.round(totalYears * periodsPerYear);
    const ratePerPeriod = rate / periodsPerYear;

    // Future Value of Annuity formula: FV = PMT × [((1 + r)^n - 1) / r]
    // Solving for PMT: PMT = FV / [((1 + r)^n - 1) / r]
    let requiredPMT: number;
    if (ratePerPeriod === 0) {
      requiredPMT = target / totalPeriods;
    } else {
      const factor = (Math.pow(1 + ratePerPeriod, totalPeriods) - 1) / ratePerPeriod;
      requiredPMT = target / factor;
    }

    const totalContrib = requiredPMT * totalPeriods;
    const estimatedReturns = target - totalContrib;

    return {
      requiredContribution: requiredPMT,
      totalContributions: totalContrib,
      estimatedReturns: Math.max(0, estimatedReturns),
      maturityValue: target,
      numberOfPeriods: totalPeriods,
    };
  }, [calculated, targetAmount, annualReturn, years, months, contributionFreq]);

  const handleCalculate = () => {
    setCalculated(true);
  };

  const handleStartGoal = () => {
    if (!result || !goalName.trim() || !targetAmount) return;

    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    const targetDate = addDays(startDate, Math.round(totalYears * 365));

    // Generate recurring entry IDs for contributions
    const linkedEntryIds: string[] = [];
    let currentDate = startDate;
    
    // Create recurring contribution entries
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

    const goalId = Math.random().toString(36).slice(2, 10);
    const assetId = Math.random().toString(36).slice(2, 10);

    // Create the goal
    const goal: Omit<Goal, "id"> = {
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
      linkedAssetId: assetId,
      linkedEntryIds,
    };

    onAddGoal(goal);

    // Create linked Other Asset
    const asset: Omit<OtherAsset, "id"> = {
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
      linkedGoalId: goalId,
      sourceAccount,
    };

    onAddOtherAsset(asset);
    onBack();
  };

  const canCalculate = goalName.trim() && targetAmount && annualReturn && (years || months) && 
    (investmentType !== "Other Investment" || investmentName.trim());

  const freqLabel = CONTRIBUTION_FREQUENCIES.find((f) => f.value === contributionFreq)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag className="h-5 w-5 text-purple-400" />
        <h3 className="font-semibold">Buy Something</h3>
      </div>

      {!calculated ? (
        <>
          <div>
            <Label className="text-xs mb-2 block">What is your goal? *</Label>
            <Input
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              placeholder="e.g., iPhone, Car, House"
              className="h-9 mb-2"
            />
            <div className="flex flex-wrap gap-1.5">
              {GOAL_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setGoalName(suggestion)}
                  className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs">Cost / Target Amount *</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="5000"
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs">Type of Investment *</Label>
            <Select value={investmentType} onValueChange={setInvestmentType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {investmentType === "Other Investment" && (
            <div>
              <Label className="text-xs">Investment Name *</Label>
              <Input
                value={investmentName}
                onChange={(e) => setInvestmentName(e.target.value)}
                placeholder="e.g., SIP, ETF, Gold Savings"
                className="h-9 mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {INVESTMENT_NAME_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInvestmentName(suggestion)}
                    className="text-[10px] px-2 py-1 rounded-full bg-muted hover:bg-muted/70 text-muted-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs">Expected Annual Rate of Return (%) *</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={annualReturn}
              onChange={(e) => setAnnualReturn(e.target.value)}
              placeholder="6"
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs mb-2 block">In how much time do you want to achieve this goal? *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Years</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Months</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Contribution Frequency *</Label>
            <Select value={contributionFreq} onValueChange={(v) => setContributionFreq(v as Frequency)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRIBUTION_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Source Account *</Label>
            <Select value={sourceAccount} onValueChange={(v) => setSourceAccount(v as AccountType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enabledAccounts
                  .filter((acc) => acc !== "creditCard")
                  .map((acc) => (
                    <SelectItem key={acc} value={acc}>
                      {acc === "cash" ? "Cash" : "Bank"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Start Date *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
          </div>
        </>
      ) : result ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/30 p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              To achieve your goal of <span className="font-semibold text-foreground">{goalName}</span> worth{" "}
              <span className="font-semibold text-foreground">{fm(parseFloat(targetAmount))}</span> in{" "}
              <span className="font-semibold text-foreground">
                {years ? `${years} year${years !== "1" ? "s" : ""}` : ""}
                {years && months ? " and " : ""}
                {months ? `${months} month${months !== "1" ? "s" : ""}` : ""}
              </span>{" "}
              at <span className="font-semibold text-foreground">{annualReturn}%</span> annual return, you need to invest:
            </p>

            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
              <p className="text-2xl font-bold text-purple-400 mb-1">{fm(result.requiredContribution)}</p>
              <p className="text-[10px] text-muted-foreground">per {freqLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Investment Type</p>
                <p className="font-bold">{investmentType === "Other Investment" ? investmentName : investmentType}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Source Account</p>
                <p className="font-bold">{sourceAccount === "cash" ? "Cash" : "Bank"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Total Contributions</p>
                <p className="font-bold">{fm(result.totalContributions)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Estimated Returns</p>
                <p className="font-bold text-success">+{fm(result.estimatedReturns)}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground mb-1">Estimated Maturity Value</p>
              <p className="text-xl font-bold text-foreground">{fm(result.maturityValue)}</p>
            </div>
          </div>

          <p className="text-sm font-medium">Would you like to start this goal?</p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCalculated(false)} className="flex-1">
              Edit / Recalculate
            </Button>
            <Button
              onClick={handleStartGoal}
              className="flex-1 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
            >
              <Target className="h-4 w-4 mr-2" />
              Start Goal
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ============ STEP 2B: PAY OFF DEBT FORM ============
interface DebtCalculationResult {
  requiredPayment: number;
  totalPayments: number;
  numberOfPeriods: number;
  completionDate: string;
}

function PayOffDebtForm({
  data,
  onAddGoal,
  onAddEntry,
  onAddLiabilityPayoff,
  onBack,
  fm,
}: {
  data: AppData;
  onAddGoal: (goal: Omit<Goal, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => string;
  onAddLiabilityPayoff?: (payoff: Omit<LiabilityPayoff, "id">) => void;
  onBack: () => void;
  fm: (n: number) => string;
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
  const [calculated, setCalculated] = useState(false);

  const enabledAccounts = data.userProfile?.enabledAccounts || ["cash", "bank"];

  const result = useMemo<DebtCalculationResult | null>(() => {
    if (!calculated || !outstandingAmount || (!years && !months)) return null;

    const principal = parseFloat(outstandingAmount);
    const rate = interestRate ? parseFloat(interestRate) / 100 : 0;
    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    
    if (principal <= 0 || totalYears <= 0) return null;

    const freqData = CONTRIBUTION_FREQUENCIES.find((f) => f.value === paymentFreq);
    if (!freqData) return null;

    const periodsPerYear = freqData.periodsPerYear;
    const totalPeriods = Math.round(totalYears * periodsPerYear);
    const ratePerPeriod = rate / periodsPerYear;

    let requiredPayment: number;
    if (ratePerPeriod === 0) {
      requiredPayment = principal / totalPeriods;
    } else {
      // Loan amortization formula: PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
      requiredPayment = principal * (ratePerPeriod * Math.pow(1 + ratePerPeriod, totalPeriods)) / 
                        (Math.pow(1 + ratePerPeriod, totalPeriods) - 1);
    }

    const completionDate = addDays(startDate, Math.round(totalYears * 365));

    return {
      requiredPayment,
      totalPayments: requiredPayment * totalPeriods,
      numberOfPeriods: totalPeriods,
      completionDate,
    };
  }, [calculated, outstandingAmount, interestRate, years, months, paymentFreq, startDate]);

  const handleCalculate = () => {
    setCalculated(true);
  };

  const handleStartPayoff = () => {
    if (!result || !outstandingAmount) return;

    const totalYears = parseFloat(years || "0") + parseFloat(months || "0") / 12;
    const targetDate = addDays(startDate, Math.round(totalYears * 365));
    const name = debtName.trim() || debtType;

    // Create recurring payment entries
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

    // Create the goal
    const goal: Omit<Goal, "id"> = {
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
    };

    onAddGoal(goal);

    // Create liability payoff record
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

  const canCalculate = (debtName.trim() || debtType !== "Other Debt") && outstandingAmount && (years || months);
  const freqLabel = CONTRIBUTION_FREQUENCIES.find((f) => f.value === paymentFreq)?.label.toLowerCase();

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="text-muted-foreground -ml-2" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <div className="flex items-center gap-2 mb-2">
        <CreditCard className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold">Pay Off a Debt</h3>
      </div>

      {!calculated ? (
        <>
          <div>
            <Label className="text-xs">What debt do you want to pay off? *</Label>
            <Select value={debtType} onValueChange={setDebtType}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEBT_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {debtType === "Other Debt" && (
            <div>
              <Label className="text-xs">Debt Name *</Label>
              <Input
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                placeholder="e.g., Home Loan, Education Loan"
                className="h-9"
              />
            </div>
          )}

          <div>
            <Label className="text-xs">Current Outstanding / Payoff Target Amount *</Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={outstandingAmount}
              onChange={(e) => setOutstandingAmount(e.target.value)}
              placeholder="10000"
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs">Annual Interest Rate (%) <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              placeholder="0"
              className="h-9"
            />
          </div>

          <div>
            <Label className="text-xs mb-2 block">In how much time do you want to pay it off? *</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Years</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Months</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={months}
                  onChange={(e) => setMonths(e.target.value)}
                  placeholder="0"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          <div>
            <Label className="text-xs">Payment Frequency *</Label>
            <Select value={paymentFreq} onValueChange={(v) => setPaymentFreq(v as Frequency)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTRIBUTION_FREQUENCIES.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Source Account *</Label>
            <Select value={sourceAccount} onValueChange={(v) => setSourceAccount(v as AccountType)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {enabledAccounts
                  .filter((acc) => acc !== "creditCard")
                  .map((acc) => (
                    <SelectItem key={acc} value={acc}>
                      {acc === "cash" ? "Cash" : "Bank"}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Start Date *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onBack} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCalculate}
              disabled={!canCalculate}
              className="flex-1 bg-gradient-to-r from-destructive to-destructive/80"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculate
            </Button>
          </div>
        </>
      ) : result ? (
        <div className="space-y-4">
          <div className="rounded-lg bg-gradient-to-br from-destructive/20 to-destructive/5 border border-destructive/30 p-4 space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              To pay off <span className="font-semibold text-foreground">{debtName || debtType}</span> of{" "}
              <span className="font-semibold text-foreground">{fm(parseFloat(outstandingAmount))}</span> in{" "}
              <span className="font-semibold text-foreground">
                {years ? `${years} year${years !== "1" ? "s" : ""}` : ""}
                {years && months ? " and " : ""}
                {months ? `${months} month${months !== "1" ? "s" : ""}` : ""}
              </span>
              {interestRate ? ` at ${interestRate}% interest` : ""}, you need to pay:
            </p>

            <div className="bg-background/50 rounded-lg p-3 border border-border/50">
              <p className="text-2xl font-bold text-destructive mb-1">{fm(result.requiredPayment)}</p>
              <p className="text-[10px] text-muted-foreground">per {freqLabel}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-0.5">Debt Type</p>
                <p className="font-bold">{debtName || debtType}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Source Account</p>
                <p className="font-bold">{sourceAccount === "cash" ? "Cash" : "Bank"}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Total Payments</p>
                <p className="font-bold">{fm(result.totalPayments)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Completion Date</p>
                <p className="font-bold">{result.completionDate}</p>
              </div>
            </div>
          </div>

          <p className="text-sm font-medium">Would you like to start this payoff plan?</p>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setCalculated(false)} className="flex-1">
              Edit / Recalculate
            </Button>
            <Button
              onClick={handleStartPayoff}
              className="flex-1 bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
            >
              <Target className="h-4 w-4 mr-2" />
              Start Payoff
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
