import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Shield, AlertTriangle, Calculator, Minus, Pause, Play, Scale } from "lucide-react";
import type { AppData, ForecastItem, Frequency, AccountType } from "@/lib/finance-types";
import {
  computeForecast, computeBalanceAtPosition, formatDate, formatMoney,
  getBalanceOnDate, getRiskDate, getMonthSubscriptionTotal,
  todayStr, daysBetween, toMonthlyAmount, getNextOccurrence,
} from "@/lib/finance-utils";
import { ForecastChart } from "@/components/ForecastChart";
import { FrequencySelect } from "@/components/FrequencySelect";
import { InvestmentCalculator } from "@/components/InvestmentCalculator";
import { ZakatCalculator } from "@/components/ZakatCalculator";
import { GoalPlanner } from "@/components/GoalPlanner";
import { TYPE_COLORS } from "@/lib/constants";

interface ForecastTabProps {
  data: AppData;
  onAddGoal: (goal: Omit<import("@/lib/finance-types").Goal, "id">) => void;
  onAddOtherAsset: (asset: Omit<import("@/lib/finance-types").OtherAsset, "id">) => void;
  onAddEntry: (entry: Omit<import("@/lib/finance-types").Entry, "id">) => string;
  onAddLiabilityPayoff?: (payoff: Omit<import("@/lib/finance-types").LiabilityPayoff, "id">) => void;
}

export function ForecastTab({ data, onAddGoal, onAddOtherAsset, onAddEntry, onAddLiabilityPayoff }: ForecastTabProps) {
  const today = data.positionDate || todayStr();
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);
  const effectiveBalance = useMemo(() => computeBalanceAtPosition(data), [data]);
  const effectiveData = useMemo(() => ({ ...data, currentBalance: effectiveBalance }), [data, effectiveBalance]);
  const forecast = useMemo(() => computeForecast(effectiveData), [effectiveData]);
  const forecastBalance = getBalanceOnDate(forecast, data.forecastDate, effectiveBalance);
  const riskDate = getRiskDate(forecast);
  const monthSubs = getMonthSubscriptionTotal(data.subscriptions);

  const summaryStats = useMemo(() => {
    let totalInflow = 0, totalOutflow = 0;
    for (const item of forecast) {
      if (item.date > data.forecastDate) break;
      if (item.amount > 0) totalInflow += item.amount;
      else totalOutflow += Math.abs(item.amount);
    }
    const lowestBalance = forecast.length > 0
      ? Math.min(effectiveBalance, ...forecast.filter(f => f.date <= data.forecastDate).map(f => f.balance))
      : effectiveBalance;
    const lowestItem = forecast.find(f => f.balance === lowestBalance);
    return { totalInflow, totalOutflow, lowestBalance, lowestDate: lowestItem?.date };
  }, [forecast, data.forecastDate, effectiveBalance]);

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const filteredForecast = useMemo(() => {
    const items = forecast.filter(f => f.date <= data.forecastDate);
    if (typeFilter === "all") return items;
    return items.filter(f => f.type === typeFilter);
  }, [forecast, data.forecastDate, typeFilter]);

  return (
    <div className="space-y-4">
      {/* Selected Date Summary */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-4 px-4">
          <p className="text-xs text-muted-foreground mb-1">Projected Balance on {formatDate(data.forecastDate)}</p>
          <p className={`text-3xl font-bold ${forecastBalance < 0 ? "text-destructive" : "text-foreground"}`}>
            {fm(forecastBalance)}
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-success" />
              <p className="text-[10px] text-muted-foreground">Expected Inflow</p>
            </div>
            <p className="text-sm font-bold text-success">{fm(summaryStats.totalInflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
              <p className="text-[10px] text-muted-foreground">Expected Outflow</p>
            </div>
            <p className="text-sm font-bold text-destructive">{fm(summaryStats.totalOutflow)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Minus className="h-3.5 w-3.5 text-warning" />
              <p className="text-[10px] text-muted-foreground">Subscriptions/mo</p>
            </div>
            <p className="text-sm font-bold">{fm(monthSubs)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              {summaryStats.lowestBalance < 0
                ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                : <Shield className="h-3.5 w-3.5 text-success" />}
              <p className="text-[10px] text-muted-foreground">Lowest Balance</p>
            </div>
            <p className={`text-sm font-bold ${summaryStats.lowestBalance < 0 ? "text-destructive" : ""}`}>
              {fm(summaryStats.lowestBalance)}
            </p>
            {summaryStats.lowestDate && (
              <p className="text-[9px] text-muted-foreground">{formatDate(summaryStats.lowestDate)}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Negative Balance Warning */}
      {riskDate && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">Negative Balance Warning</p>
              <p className="text-xs text-muted-foreground">
                Balance drops below zero on {formatDate(riskDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <ForecastChart forecast={forecast} currentBalance={effectiveBalance} forecastDate={data.forecastDate} />

      {/* Forecast Timeline */}
      <Card>
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Forecast Timeline</CardTitle>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Inflow</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="cc_bill">CC Bills</SelectItem>
                <SelectItem value="transfer">Transfers</SelectItem>
                <SelectItem value="goal_contribution">Goal Contrib</SelectItem>
                <SelectItem value="debt_payoff">Debt Payoff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {filteredForecast.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events in this period.</p>
          ) : (
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {filteredForecast.slice(0, 50).map((item, i) => (
                <div key={i} className={`flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 ${
                  item.isCheque ? "border-l-4 border-l-amber-400" : item.isDebtLinked ? "border-l-4 border-l-orange-400" : ""
                }`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className={`text-[9px] shrink-0 px-1.5 ${TYPE_COLORS[item.type] || ""}`}>
                      {item.type === "income" ? "inflow" : item.type === "cc_bill" ? "CC Bill" : item.type}
                    </Badge>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-medium truncate">{item.label}</p>
                        {item.isCheque && <Badge className="text-[8px] bg-amber-500/20 text-amber-400 px-1">Cheque</Badge>}
                        {item.isDebtLinked && <Badge className="text-[8px] bg-orange-500/20 text-orange-400 px-1">Debt</Badge>}
                        {item.isOptional && <Badge variant="outline" className="text-[8px] px-1">Optional</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{formatDate(item.date)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-xs font-bold ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
                      {item.amount >= 0 ? "+" : ""}{fm(item.amount)}
                    </p>
                    <p className={`text-[10px] ${item.balance < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {fm(item.balance)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Set a Goal */}
      <GoalPlanner data={data} onAddGoal={onAddGoal} onAddOtherAsset={onAddOtherAsset} onAddEntry={onAddEntry} onAddLiabilityPayoff={onAddLiabilityPayoff} fm={fm} />

      {/* What-If Simulator */}
      <WhatIfSimulator data={data} currentForecast={forecast} effectiveBalance={effectiveBalance} fm={fm} />

      {/* EMI Planner */}
      <EMIPlanner data={data} effectiveBalance={effectiveBalance} fm={fm} />

      {/* Investment Calculator */}
      <InvestmentCalculator
        fm={fm}
        defaultCompounding={data.settings?.defaultCompoundingFrequency || "monthly"}
      />

      {/* Zakat Calculator */}
      <ZakatCalculator
        fm={fm}
        defaultNisabBasis={data.settings?.preferredNisabBasis || "silver"}
        defaultGoldPrice={data.settings?.defaultGoldPrice || ""}
        defaultSilverPrice={data.settings?.defaultSilverPrice || ""}
      />

      {/* Investment Advisor */}
      <InvestmentAdvisor data={data} effectiveBalance={effectiveBalance} fm={fm} />

      {/* Debt Management */}
      <DebtManagement data={data} fm={fm} />
    </div>
  );
}

// ============ WHAT-IF SIMULATOR ============
function WhatIfSimulator({ data, currentForecast, effectiveBalance, fm }: {
  data: AppData; currentForecast: ForecastItem[]; effectiveBalance: number; fm: (n: number) => string;
}) {
  const [scenario, setScenario] = useState<string>("delay_salary");
  const [delayDays, setDelayDays] = useState("5");
  const [cancelSubId, setCancelSubId] = useState<string>("");
  const [emiAmount, setEmiAmount] = useState("400");
  const [rentChange, setRentChange] = useState("200");
  const [investReduce, setInvestReduce] = useState("50");
  const [simulated, setSimulated] = useState(false);

  const currentRiskDate = getRiskDate(currentForecast);
  const currentLowest = currentForecast.length > 0
    ? Math.min(effectiveBalance, ...currentForecast.filter(f => f.date <= data.forecastDate).map(f => f.balance))
    : effectiveBalance;

  const simulatedResult = useMemo(() => {
    if (!simulated) return null;
    let simData = JSON.parse(JSON.stringify(data)) as AppData;

    switch (scenario) {
      case "delay_salary": {
        const days = parseInt(delayDays) || 0;
        simData.entries = simData.entries.map(e => {
          if (e.amount > 0 && e.label.toLowerCase().includes("salary")) {
            const newDate = new Date(e.date);
            newDate.setDate(newDate.getDate() + days);
            return { ...e, date: newDate.toISOString().slice(0, 10) };
          }
          return e;
        });
        break;
      }
      case "cancel_sub": {
        if (cancelSubId) {
          simData.subscriptions = simData.subscriptions.map(s =>
            s.id === cancelSubId ? { ...s, includeInForecast: false } : s
          );
        }
        break;
      }
      case "add_emi": {
        const amt = parseFloat(emiAmount) || 0;
        simData.entries = [...simData.entries, {
          id: "sim-emi", label: "Simulated EMI", amount: -amt,
          date: data.positionDate || todayStr(), frequency: "monthly" as Frequency,
          category: "Debt", account: "bank" as const, includeInForecast: true,
        }];
        break;
      }
      case "change_rent": {
        const change = parseFloat(rentChange) || 0;
        simData.entries = simData.entries.map(e => {
          if (e.amount < 0 && e.category.toLowerCase().includes("housing")) {
            return { ...e, amount: e.amount - change };
          }
          return e;
        });
        break;
      }
      case "reduce_investment": {
        const pct = parseInt(investReduce) || 0;
        simData.investments = (simData.investments || []).map(i => ({
          ...i, amount: i.amount * (1 - pct / 100),
        }));
        break;
      }
    }

    const simBalance = computeBalanceAtPosition(simData);
    const simEffData = { ...simData, currentBalance: simBalance };
    const simForecast = computeForecast(simEffData);
    const simForecastBal = getBalanceOnDate(simForecast, data.forecastDate, simBalance);
    const simRisk = getRiskDate(simForecast);
    const simLowest = simForecast.length > 0
      ? Math.min(simBalance, ...simForecast.filter(f => f.date <= data.forecastDate).map(f => f.balance))
      : simBalance;

    return { balance: simForecastBal, riskDate: simRisk, lowestBalance: simLowest };
  }, [simulated, scenario, data, delayDays, cancelSubId, emiAmount, rentChange, investReduce]);

  const currentForecastBal = getBalanceOnDate(currentForecast, data.forecastDate, effectiveBalance);

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4 text-info" />
          What-If Simulator
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Simulate changes without affecting your data</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <Select value={scenario} onValueChange={(v) => { setScenario(v); setSimulated(false); }}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="delay_salary">Delay salary by X days</SelectItem>
            <SelectItem value="cancel_sub">Cancel a subscription</SelectItem>
            <SelectItem value="add_emi">Add a new EMI</SelectItem>
            <SelectItem value="change_rent">Increase rent</SelectItem>
            <SelectItem value="reduce_investment">Reduce investments</SelectItem>
          </SelectContent>
        </Select>

        {scenario === "delay_salary" && (
          <div><Label className="text-xs">Delay by (days)</Label>
            <Input type="number" value={delayDays} onChange={e => setDelayDays(e.target.value)} className="h-9" /></div>
        )}
        {scenario === "cancel_sub" && (
          <div><Label className="text-xs">Select subscription</Label>
            <Select value={cancelSubId} onValueChange={setCancelSubId}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Choose..." /></SelectTrigger>
              <SelectContent>
                {data.subscriptions.filter(s => s.includeInForecast).map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({fm(s.amount)}/{s.frequency})</SelectItem>
                ))}
              </SelectContent>
            </Select></div>
        )}
        {scenario === "add_emi" && (
          <div><Label className="text-xs">Monthly EMI amount</Label>
            <Input type="number" inputMode="decimal" value={emiAmount} onChange={e => setEmiAmount(e.target.value)} className="h-9" /></div>
        )}
        {scenario === "change_rent" && (
          <div><Label className="text-xs">Increase amount</Label>
            <Input type="number" inputMode="decimal" value={rentChange} onChange={e => setRentChange(e.target.value)} className="h-9" /></div>
        )}
        {scenario === "reduce_investment" && (
          <div><Label className="text-xs">Reduce by (%)</Label>
            <Slider value={[parseInt(investReduce) || 0]} onValueChange={(v) => setInvestReduce(String(v[0]))} min={0} max={100} step={10} />
            <p className="text-xs text-muted-foreground text-right mt-1">{investReduce}%</p></div>
        )}

        <Button className="w-full" variant="outline" onClick={() => setSimulated(true)}>Run Simulation</Button>

        {simulated && simulatedResult && (
          <div className="rounded-lg border border-info/30 bg-info/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-info">⚡ Simulation Results (not saved)</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-muted-foreground">Current Balance</p><p className="font-bold">{fm(currentForecastBal)}</p></div>
              <div><p className="text-muted-foreground">Simulated Balance</p>
                <p className={`font-bold ${simulatedResult.balance < currentForecastBal ? "text-destructive" : "text-success"}`}>{fm(simulatedResult.balance)}</p></div>
              <div><p className="text-muted-foreground">Current Lowest</p><p className="font-bold">{fm(currentLowest)}</p></div>
              <div><p className="text-muted-foreground">Simulated Lowest</p>
                <p className={`font-bold ${simulatedResult.lowestBalance < currentLowest ? "text-destructive" : "text-success"}`}>{fm(simulatedResult.lowestBalance)}</p></div>
              <div><p className="text-muted-foreground">Current Risk</p><p className="font-bold">{currentRiskDate ? formatDate(currentRiskDate) : "None ✓"}</p></div>
              <div><p className="text-muted-foreground">Simulated Risk</p>
                <p className={`font-bold ${simulatedResult.riskDate ? "text-destructive" : "text-success"}`}>{simulatedResult.riskDate ? formatDate(simulatedResult.riskDate) : "None ✓"}</p></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ EMI PLANNER (max 10 years) ============
function EMIPlanner({ data, effectiveBalance, fm }: { data: AppData; effectiveBalance: number; fm: (n: number) => string }) {
  const [loanAmount, setLoanAmount] = useState("");
  const [rate, setRate] = useState("10");
  const [tenure, setTenure] = useState("12");
  const [calculated, setCalculated] = useState(false);

  const MAX_TENURE = 120; // 10 years

  const handleTenureChange = (v: number[]) => {
    setTenure(String(Math.min(v[0], MAX_TENURE)));
    setCalculated(false);
  };

  const result = useMemo(() => {
    if (!calculated) return null;
    const p = parseFloat(loanAmount) || 0;
    const r = (parseFloat(rate) || 0) / 100 / 12;
    const n = Math.min(parseInt(tenure) || 1, MAX_TENURE);

    let emi: number;
    if (r === 0) emi = p / n;
    else emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);

    const simData = JSON.parse(JSON.stringify(data)) as AppData;
    simData.entries = [...simData.entries, {
      id: "emi-sim", label: "Loan EMI", amount: -emi,
      date: data.positionDate || todayStr(), frequency: "monthly" as Frequency,
      category: "Debt", account: "bank" as const, includeInForecast: true,
    }];

    const simBalance = computeBalanceAtPosition(simData);
    const simForecast = computeForecast({ ...simData, currentBalance: simBalance });
    const simRisk = getRiskDate(simForecast);

    const monthlyIncome = data.entries.filter(e => e.amount > 0 && e.includeInForecast).reduce((sum, e) => sum + toMonthlyAmount(e.amount, e.frequency), 0);
    const monthlyExpense = data.entries.filter(e => e.amount < 0 && e.includeInForecast).reduce((sum, e) => sum + toMonthlyAmount(Math.abs(e.amount), e.frequency), 0);
    const monthlySubs = getMonthSubscriptionTotal(data.subscriptions);
    const freeCash = monthlyIncome - monthlyExpense - monthlySubs - emi;

    let status: "safe" | "tight" | "risky";
    if (freeCash > emi) status = "safe";
    else if (freeCash > 0) status = "tight";
    else status = "risky";

    return { emi, totalPayment: emi * n, totalInterest: emi * n - p, simRisk, freeCash, status };
  }, [calculated, loanAmount, rate, tenure, data, effectiveBalance]);

  const statusColors = {
    safe: "text-success bg-success/10 border-success/20",
    tight: "text-warning bg-warning/10 border-warning/20",
    risky: "text-destructive bg-destructive/10 border-destructive/20",
  };

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" /> Loan / EMI Planner</CardTitle>
        <p className="text-[10px] text-muted-foreground">Estimate affordability before committing</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Loan Amount</Label>
            <Input type="number" inputMode="decimal" value={loanAmount} onChange={e => { setLoanAmount(e.target.value); setCalculated(false); }} className="h-9" placeholder="50000" /></div>
          <div><Label className="text-xs">Annual Rate (%)</Label>
            <Input type="number" inputMode="decimal" value={rate} onChange={e => { setRate(e.target.value); setCalculated(false); }} className="h-9" /></div>
        </div>
        <div>
          <Label className="text-xs">Tenure (months) — max 10 years</Label>
          <Slider value={[Math.min(parseInt(tenure) || 12, MAX_TENURE)]} onValueChange={handleTenureChange} min={3} max={MAX_TENURE} step={3} />
          <p className="text-xs text-muted-foreground text-right mt-1">{Math.min(parseInt(tenure) || 12, MAX_TENURE)} months ({(Math.min(parseInt(tenure) || 12, MAX_TENURE) / 12).toFixed(1)} years)</p>
        </div>

        <Button className="w-full" variant="outline" onClick={() => setCalculated(true)} disabled={!loanAmount}>Calculate EMI</Button>

        {calculated && result && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border/50 p-3">
              <p className="text-[10px] text-muted-foreground mb-1">Estimated Monthly EMI</p>
              <p className="text-2xl font-bold">{fm(result.emi)}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span>Total: {fm(result.totalPayment)}</span>
                <span>Interest: {fm(result.totalInterest)}</span>
              </div>
            </div>
            <div className={`rounded-lg border p-3 ${statusColors[result.status]}`}>
              <p className="text-sm font-semibold capitalize">{result.status}</p>
              <p className="text-xs mt-1">
                {result.status === "safe" && "This EMI fits comfortably in your budget."}
                {result.status === "tight" && "This EMI is manageable but leaves little room."}
                {result.status === "risky" && "This EMI may cause cash flow problems."}
              </p>
              <p className="text-xs mt-1">Free cash after EMI: {fm(result.freeCash)}/mo</p>
              {result.simRisk && <p className="text-xs mt-1">⚠️ Negative balance on {formatDate(result.simRisk)}</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ INVESTMENT ADVISOR ============
function InvestmentAdvisor({ data, effectiveBalance, fm }: { data: AppData; effectiveBalance: number; fm: (n: number) => string }) {
  const investments = data.investments || [];
  const [selectedId, setSelectedId] = useState<string>(investments[0]?.id || "");
  const [reduction, setReduction] = useState(50);
  const [paused, setPaused] = useState(false);
  const [simulated, setSimulated] = useState(false);

  const result = useMemo(() => {
    if (!simulated || investments.length === 0) return null;
    const simData = JSON.parse(JSON.stringify(data)) as AppData;
    simData.investments = (simData.investments || []).map(i => {
      if (i.id === selectedId) {
        if (paused) return { ...i, includeInForecast: false };
        return { ...i, amount: i.amount * (1 - reduction / 100) };
      }
      return i;
    });
    const simBalance = computeBalanceAtPosition(simData);
    const simForecast = computeForecast({ ...simData, currentBalance: simBalance });
    const simRisk = getRiskDate(simForecast);
    const origForecast = computeForecast({ ...data, currentBalance: effectiveBalance });
    const origRisk = getRiskDate(origForecast);
    const origLowest = origForecast.length > 0 ? Math.min(effectiveBalance, ...origForecast.filter(f => f.date <= data.forecastDate).map(f => f.balance)) : effectiveBalance;
    const simLowest = simForecast.length > 0 ? Math.min(simBalance, ...simForecast.filter(f => f.date <= data.forecastDate).map(f => f.balance)) : simBalance;
    const inv = investments.find(i => i.id === selectedId);
    const savedPerMonth = inv ? toMonthlyAmount(paused ? inv.amount : inv.amount * reduction / 100, inv.frequency) : 0;
    let advice: string;
    if (!origRisk && !simRisk) advice = "Keeping this investment is affordable.";
    else if (origRisk && !simRisk) advice = "Reducing this investment prevents a negative balance.";
    else if (!origRisk) advice = "This change doesn't significantly impact your safety.";
    else advice = "Reducing this investment improves your short-term cash safety.";
    return { origRisk, simRisk, origLowest, simLowest, savedPerMonth, advice };
  }, [simulated, data, selectedId, reduction, paused, effectiveBalance, investments]);

  if (investments.length === 0) return null;

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-warning" /> Investment Advisor</CardTitle>
        <p className="text-[10px] text-muted-foreground">See how reducing investments affects your balance</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <Select value={selectedId} onValueChange={(v) => { setSelectedId(v); setSimulated(false); }}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Select investment" /></SelectTrigger>
          <SelectContent>
            {investments.map(inv => (<SelectItem key={inv.id} value={inv.id}>{inv.name}</SelectItem>))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3">
          <Button variant={paused ? "default" : "outline"} size="sm" onClick={() => { setPaused(!paused); setSimulated(false); }}>
            {paused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
            {paused ? "Resume" : "Pause"}
          </Button>
          {!paused && (
            <div className="flex-1"><Label className="text-[10px]">Reduce by {reduction}%</Label>
              <Slider value={[reduction]} onValueChange={(v) => { setReduction(v[0]); setSimulated(false); }} min={10} max={100} step={10} /></div>
          )}
        </div>
        <Button className="w-full" variant="outline" onClick={() => setSimulated(true)}>Simulate</Button>
        {simulated && result && (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
            <p className="text-xs font-semibold text-warning">💰 Simulation Result</p>
            <p className="text-xs text-muted-foreground">{result.advice}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-muted-foreground">Monthly Saved</p><p className="font-bold text-success">+{fm(result.savedPerMonth)}</p></div>
              <div><p className="text-muted-foreground">Lowest Balance</p>
                <p className={`font-bold ${result.simLowest > result.origLowest ? "text-success" : ""}`}>{fm(result.simLowest)}</p></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============ DEBT MANAGEMENT ============
function DebtManagement({ data, fm }: { data: AppData; fm: (n: number) => string }) {
  const plans = data.debtPlans || [];
  const [selectedDebtId, setSelectedDebtId] = useState<string>("");

  const debtAnalysis = useMemo(() => {
    if (plans.length === 0) return null;

    let totalAssets = 0; // money owed TO user (debt given, expecting recovery)
    let totalLiabilities = 0; // money user OWES (debt received, needs repayment)
    let assetPaid = 0;
    let liabilityPaid = 0;

    const debtItems = plans.map(plan => {
      const parent = data.entries.find(e => e.id === plan.parentEntryId);
      const linkedEntries = data.entries.filter(e => plan.linkedEntryIds.includes(e.id));
      const settledAmount = linkedEntries.filter(e => !e.includeInForecast).reduce((sum, e) => sum + Math.abs(e.amount), 0);
      const remaining = plan.totalAmount - settledAmount;
      const allSettled = remaining <= 0.01;

      if (plan.direction === "given") {
        totalAssets += plan.totalAmount;
        assetPaid += settledAmount;
      } else {
        totalLiabilities += plan.totalAmount;
        liabilityPaid += settledAmount;
      }

      return {
        plan,
        parent,
        linkedEntries,
        settledAmount,
        remaining: Math.max(0, remaining),
        status: allSettled ? "Settled" as const : settledAmount > 0 ? "Partially Settled" as const : "Active" as const,
      };
    });

    const netDebt = totalAssets - totalLiabilities;
    let serviceability: string;
    if (totalLiabilities === 0) serviceability = "No debt liabilities to service.";
    else if (totalAssets >= totalLiabilities) serviceability = "Your expected debt recoveries appear sufficient to cover planned repayments.";
    else if (totalAssets > totalLiabilities * 0.5) serviceability = "There may be a debt servicing gap — monitor closely.";
    else serviceability = "Your debt liabilities exceed your current expected recoveries.";

    return { totalAssets, totalLiabilities, netDebt, serviceability, debtItems, assetPaid, liabilityPaid };
  }, [plans, data.entries]);

  if (!debtAnalysis || plans.length === 0) return null;

  const selected = selectedDebtId ? debtAnalysis.debtItems.find(d => d.plan.id === selectedDebtId) : null;

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4 text-orange-400" />
          Debt Management
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Net Position */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-success/10 p-2">
            <p className="text-[9px] text-muted-foreground">Debt Assets</p>
            <p className="text-xs font-bold text-success">{fm(debtAnalysis.totalAssets)}</p>
          </div>
          <div className="rounded-lg bg-destructive/10 p-2">
            <p className="text-[9px] text-muted-foreground">Debt Liabilities</p>
            <p className="text-xs font-bold text-destructive">{fm(debtAnalysis.totalLiabilities)}</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <p className="text-[9px] text-muted-foreground">Net Debt</p>
            <p className={`text-xs font-bold ${debtAnalysis.netDebt >= 0 ? "text-success" : "text-destructive"}`}>{fm(debtAnalysis.netDebt)}</p>
          </div>
        </div>

        {/* Serviceability */}
        <div className="rounded-lg border border-border/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Serviceability</p>
          <p className="text-xs text-foreground">{debtAnalysis.serviceability}</p>
        </div>

        {/* Individual Debt Selection */}
        <div>
          <Label className="text-xs">Inspect individual debt</Label>
          <Select value={selectedDebtId} onValueChange={setSelectedDebtId}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select a debt..." /></SelectTrigger>
            <SelectContent>
              {debtAnalysis.debtItems.map(d => (
                <SelectItem key={d.plan.id} value={d.plan.id}>
                  {d.parent?.label || "Debt"} — {fm(d.plan.totalAmount)} ({d.plan.direction === "received" ? "Received" : "Given"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selected && (
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{selected.parent?.label || "Debt"}</p>
              <Badge className={`text-[9px] ${
                selected.status === "Settled" ? "bg-success/20 text-success" :
                selected.status === "Partially Settled" ? "bg-warning/20 text-warning" :
                "bg-info/20 text-info"
              }`}>{selected.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><p className="text-muted-foreground">Original Amount</p><p className="font-bold">{fm(selected.plan.totalAmount)}</p></div>
              <div><p className="text-muted-foreground">{selected.plan.direction === "received" ? "Repaid" : "Recovered"}</p><p className="font-bold">{fm(selected.settledAmount)}</p></div>
              <div><p className="text-muted-foreground">Remaining</p><p className="font-bold">{fm(selected.remaining)}</p></div>
              <div><p className="text-muted-foreground">Splits</p><p className="font-bold">{selected.plan.splits} × {selected.plan.frequency}</p></div>
            </div>
            {selected.linkedEntries.length > 0 && (
              <div className="space-y-1 mt-2">
                <p className="text-[10px] font-semibold text-muted-foreground">
                  {selected.plan.direction === "received" ? "REPAYMENT SCHEDULE" : "RECOVERY SCHEDULE"}
                </p>
                {selected.linkedEntries.map(e => (
                  <div key={e.id} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{formatDate(e.date)}</span>
                    <span className={`font-medium ${e.amount >= 0 ? "text-success" : "text-destructive"}`}>{fm(Math.abs(e.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
