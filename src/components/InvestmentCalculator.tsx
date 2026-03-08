import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface InvestmentCalculatorProps {
  fm: (n: number) => string;
  defaultCompounding?: string;
}

type CompoundingFreq = "monthly" | "halfyearly" | "annually";

const COMPOUNDING_OPTIONS: { value: CompoundingFreq; label: string; n: number }[] = [
  { value: "monthly", label: "Monthly", n: 12 },
  { value: "halfyearly", label: "Half-Yearly", n: 2 },
  { value: "annually", label: "Annually", n: 1 },
];

function calculateMaturity(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  tenureMonths: number,
  compoundingN: number
): { maturityValue: number; totalInvested: number; profit: number } {
  const r = annualRate / 100;
  const ratePerPeriod = r / compoundingN;
  const totalPeriods = (tenureMonths / 12) * compoundingN;

  // Principal compound: P * (1 + r/n)^(n*t)
  const principalGrowth = principal * Math.pow(1 + ratePerPeriod, totalPeriods);

  // Recurring contribution (monthly → compound growth)
  let contributionGrowth = 0;
  if (monthlyContribution > 0) {
    for (let m = 1; m <= tenureMonths; m++) {
      const remainingYears = (tenureMonths - m) / 12;
      const remainingPeriods = remainingYears * compoundingN;
      contributionGrowth += monthlyContribution * Math.pow(1 + ratePerPeriod, remainingPeriods);
    }
  }

  const maturityValue = principalGrowth + contributionGrowth;
  const totalInvested = principal + monthlyContribution * tenureMonths;
  const profit = maturityValue - totalInvested;

  return { maturityValue, totalInvested, profit };
}

export function InvestmentCalculator({ fm, defaultCompounding = "monthly" }: InvestmentCalculatorProps) {
  const [principal, setPrincipal] = useState("");
  const [monthlyContrib, setMonthlyContrib] = useState("");
  const [annualReturn, setAnnualReturn] = useState("10");
  const [tenureMonths, setTenureMonths] = useState(60);
  const [compounding, setCompounding] = useState<CompoundingFreq>(
    (defaultCompounding as CompoundingFreq) || "monthly"
  );
  const [calculated, setCalculated] = useState(false);

  const compoundingN = COMPOUNDING_OPTIONS.find(c => c.value === compounding)?.n || 12;

  const result = useMemo(() => {
    if (!calculated) return null;
    const p = parseFloat(principal) || 0;
    const mc = parseFloat(monthlyContrib) || 0;
    const rate = parseFloat(annualReturn) || 0;
    if (p === 0 && mc === 0) return null;
    return calculateMaturity(p, mc, rate, tenureMonths, compoundingN);
  }, [calculated, principal, monthlyContrib, annualReturn, tenureMonths, compoundingN]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return [
      { name: "Invested", value: result.totalInvested, color: "hsl(var(--primary))" },
      { name: "Profit", value: result.profit, color: "hsl(var(--success))" },
    ];
  }, [result]);

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Investment Calculator
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Estimate maturity value with compound interest</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Principal / Starting Amount</Label>
            <Input
              type="number" inputMode="decimal" placeholder="10000"
              value={principal}
              onChange={e => { setPrincipal(e.target.value); setCalculated(false); }}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Monthly Contribution</Label>
            <Input
              type="number" inputMode="decimal" placeholder="0 (optional)"
              value={monthlyContrib}
              onChange={e => { setMonthlyContrib(e.target.value); setCalculated(false); }}
              className="h-9"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Annual Return (%)</Label>
            <Input
              type="number" inputMode="decimal"
              value={annualReturn}
              onChange={e => { setAnnualReturn(e.target.value); setCalculated(false); }}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs">Compounding</Label>
            <Select value={compounding} onValueChange={(v) => { setCompounding(v as CompoundingFreq); setCalculated(false); }}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {COMPOUNDING_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs">Tenure: {tenureMonths} months ({(tenureMonths / 12).toFixed(1)} years)</Label>
          <Slider
            value={[tenureMonths]} min={6} max={360} step={6}
            onValueChange={(v) => { setTenureMonths(v[0]); setCalculated(false); }}
          />
        </div>

        <Button
          className="w-full" variant="outline"
          onClick={() => setCalculated(true)}
          disabled={!principal && !monthlyContrib}
        >
          Calculate Maturity
        </Button>

        {calculated && result && (
          <div className="space-y-3">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-primary/10 p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Total Invested</p>
                <p className="text-xs font-bold text-foreground">{fm(result.totalInvested)}</p>
              </div>
              <div className="rounded-lg bg-success/10 p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Estimated Profit</p>
                <p className="text-xs font-bold text-success">{fm(result.profit)}</p>
              </div>
              <div className="rounded-lg bg-accent/50 p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Maturity Value</p>
                <p className="text-xs font-bold text-primary">{fm(result.maturityValue)}</p>
              </div>
            </div>

            {/* Compounding label */}
            <div className="rounded-lg border border-border/50 p-3 text-center">
              <p className="text-[10px] text-muted-foreground mb-0.5">Compounding Frequency</p>
              <p className="text-sm font-semibold text-foreground">
                {COMPOUNDING_OPTIONS.find(c => c.value === compounding)?.label}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Return: {((result.profit / result.totalInvested) * 100).toFixed(1)}% total
              </p>
            </div>

            {/* Mini Bar Chart */}
            {result.profit > 0 && (
              <div className="h-[120px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number) => fm(value)} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
