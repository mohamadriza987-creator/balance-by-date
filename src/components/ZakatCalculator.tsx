import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ChevronDown, ChevronUp, Landmark, Wheat, Info } from "lucide-react";

interface ZakatCalculatorProps {
  fm: (n: number) => string;
  defaultNisabBasis?: "gold" | "silver";
  defaultGoldPrice?: string;
  defaultSilverPrice?: string;
}

// Nisab thresholds
const GOLD_NISAB_GRAMS = 87.48;
const SILVER_NISAB_GRAMS = 612.36;
const ZAKAT_RATE = 0.025; // 2.5%

export function ZakatCalculator({
  fm,
  defaultNisabBasis = "silver",
  defaultGoldPrice = "",
  defaultSilverPrice = "",
}: ZakatCalculatorProps) {
  const [nisabBasis, setNisabBasis] = useState<"gold" | "silver">(defaultNisabBasis);
  const [goldPricePerGram, setGoldPricePerGram] = useState(defaultGoldPrice);
  const [silverPricePerGram, setSilverPricePerGram] = useState(defaultSilverPrice);

  // Assets
  const [cashOnHand, setCashOnHand] = useState("");
  const [bankBalance, setBankBalance] = useState("");
  const [goldQty, setGoldQty] = useState("");
  const [goldPrice, setGoldPrice] = useState("");
  const [silverQty, setSilverQty] = useState("");
  const [silverPrice, setSilverPrice] = useState("");
  const [investments, setInvestments] = useState("");
  const [recoverableDebts, setRecoverableDebts] = useState("");
  const [otherAssets, setOtherAssets] = useState("");

  // Liabilities
  const [debts12m, setDebts12m] = useState("");
  const [shortTermPayables, setShortTermPayables] = useState("");
  const [overduePayments, setOverduePayments] = useState("");
  const [currentInstalments, setCurrentInstalments] = useState("");

  // Agricultural section
  const [showAgri, setShowAgri] = useState(false);
  const [agriValue, setAgriValue] = useState("");
  const [irrigationMethod, setIrrigationMethod] = useState<"natural" | "artificial">("natural");

  const [calculated, setCalculated] = useState(false);

  const result = useMemo(() => {
    if (!calculated) return null;

    const gPrice = parseFloat(goldPricePerGram) || parseFloat(goldPrice) || 0;
    const sPrice = parseFloat(silverPricePerGram) || parseFloat(silverPrice) || 0;

    // Nisab threshold in currency
    const nisabAmount = nisabBasis === "gold"
      ? GOLD_NISAB_GRAMS * gPrice
      : SILVER_NISAB_GRAMS * sPrice;

    // Total assets
    const goldValue = (parseFloat(goldQty) || 0) * (parseFloat(goldPrice) || gPrice);
    const silverValue = (parseFloat(silverQty) || 0) * (parseFloat(silverPrice) || sPrice);
    const totalAssets =
      (parseFloat(cashOnHand) || 0) +
      (parseFloat(bankBalance) || 0) +
      goldValue +
      silverValue +
      (parseFloat(investments) || 0) +
      (parseFloat(recoverableDebts) || 0) +
      (parseFloat(otherAssets) || 0);

    // Total liabilities
    const totalLiabilities =
      (parseFloat(debts12m) || 0) +
      (parseFloat(shortTermPayables) || 0) +
      (parseFloat(overduePayments) || 0) +
      (parseFloat(currentInstalments) || 0);

    const netWealth = totalAssets - totalLiabilities;
    const zakatDue = netWealth >= nisabAmount && nisabAmount > 0;
    const zakatAmount = zakatDue ? netWealth * ZAKAT_RATE : 0;

    // Agricultural zakat (separate calculation)
    let agriZakat = 0;
    if (showAgri && parseFloat(agriValue) > 0) {
      const rate = irrigationMethod === "natural" ? 0.10 : 0.05; // 10% or 5%
      agriZakat = (parseFloat(agriValue) || 0) * rate;
    }

    return {
      totalAssets,
      totalLiabilities,
      netWealth,
      nisabAmount,
      nisabBasis,
      zakatDue,
      zakatAmount,
      agriZakat,
      goldValue,
      silverValue,
    };
  }, [
    calculated, nisabBasis, goldPricePerGram, silverPricePerGram,
    cashOnHand, bankBalance, goldQty, goldPrice, silverQty, silverPrice,
    investments, recoverableDebts, otherAssets,
    debts12m, shortTermPayables, overduePayments, currentInstalments,
    showAgri, agriValue, irrigationMethod,
  ]);

  const resetCalc = () => setCalculated(false);

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Landmark className="h-4 w-4 text-emerald-500" />
          Zakat Calculator
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">Estimate your annual zakat obligation</p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-4">
        {/* Nisab Basis */}
        <div>
          <Label className="text-xs font-semibold">Nisab Basis</Label>
          <RadioGroup value={nisabBasis} onValueChange={(v) => { setNisabBasis(v as "gold" | "silver"); resetCalc(); }} className="flex gap-4 mt-1.5">
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="gold" id="zk-gold" />
              <Label htmlFor="zk-gold" className="text-xs">Gold ({GOLD_NISAB_GRAMS}g)</Label>
            </div>
            <div className="flex items-center gap-1.5">
              <RadioGroupItem value="silver" id="zk-silver" />
              <Label htmlFor="zk-silver" className="text-xs">Silver ({SILVER_NISAB_GRAMS}g)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Commodity Prices */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Gold Price / gram</Label>
            <Input type="number" inputMode="decimal" placeholder="Enter price" value={goldPricePerGram} onChange={e => { setGoldPricePerGram(e.target.value); resetCalc(); }} className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Silver Price / gram</Label>
            <Input type="number" inputMode="decimal" placeholder="Enter price" value={silverPricePerGram} onChange={e => { setSilverPricePerGram(e.target.value); resetCalc(); }} className="h-9" />
          </div>
        </div>

        {/* Assets */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Zakatable Assets</Label>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-[11px]">Cash on Hand</Label>
              <Input type="number" inputMode="decimal" value={cashOnHand} onChange={e => { setCashOnHand(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Bank Balance</Label>
              <Input type="number" inputMode="decimal" value={bankBalance} onChange={e => { setBankBalance(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Gold (grams)</Label>
              <Input type="number" inputMode="decimal" value={goldQty} onChange={e => { setGoldQty(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Gold Price/g (override)</Label>
              <Input type="number" inputMode="decimal" value={goldPrice} onChange={e => { setGoldPrice(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="Use above" />
            </div>
            <div>
              <Label className="text-[11px]">Silver (grams)</Label>
              <Input type="number" inputMode="decimal" value={silverQty} onChange={e => { setSilverQty(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Silver Price/g (override)</Label>
              <Input type="number" inputMode="decimal" value={silverPrice} onChange={e => { setSilverPrice(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="Use above" />
            </div>
            <div>
              <Label className="text-[11px]">Investments / Funds</Label>
              <Input type="number" inputMode="decimal" value={investments} onChange={e => { setInvestments(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Recoverable Debts</Label>
              <Input type="number" inputMode="decimal" value={recoverableDebts} onChange={e => { setRecoverableDebts(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div className="col-span-2">
              <Label className="text-[11px]">Other Zakatable Assets</Label>
              <Input type="number" inputMode="decimal" value={otherAssets} onChange={e => { setOtherAssets(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Liabilities */}
        <div>
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductible Liabilities</Label>
          <p className="text-[10px] text-muted-foreground mb-2">Only debts/obligations due within the next 12 months</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px]">Debts Due (12 months)</Label>
              <Input type="number" inputMode="decimal" value={debts12m} onChange={e => { setDebts12m(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Short-term Payables</Label>
              <Input type="number" inputMode="decimal" value={shortTermPayables} onChange={e => { setShortTermPayables(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Overdue Payments</Label>
              <Input type="number" inputMode="decimal" value={overduePayments} onChange={e => { setOverduePayments(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Current Instalments</Label>
              <Input type="number" inputMode="decimal" value={currentInstalments} onChange={e => { setCurrentInstalments(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
          </div>
        </div>

        {/* Agricultural / Produce Section */}
        <Collapsible open={showAgri} onOpenChange={setShowAgri}>
          <CollapsibleTrigger className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors py-1">
            <span className="flex items-center gap-1.5"><Wheat className="h-3.5 w-3.5" /> Agricultural Produce (Optional)</span>
            {showAgri ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-2">
            <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
              <p className="text-[10px] text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Agricultural zakat rules may differ by interpretation and local guidance. This provides a common estimate.
              </p>
            </div>
            <div>
              <Label className="text-[11px]">Produce Value (wheat/crops)</Label>
              <Input type="number" inputMode="decimal" value={agriValue} onChange={e => { setAgriValue(e.target.value); resetCalc(); }} className="h-8 text-sm" placeholder="0" />
            </div>
            <div>
              <Label className="text-[11px]">Irrigation Method</Label>
              <Select value={irrigationMethod} onValueChange={(v) => { setIrrigationMethod(v as "natural" | "artificial"); resetCalc(); }}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Naturally Watered (10%)</SelectItem>
                  <SelectItem value="artificial">Artificially Irrigated (5%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Calculate */}
        <Button className="w-full" variant="outline" onClick={() => setCalculated(true)}>
          Calculate Zakat
        </Button>

        {/* Results */}
        {calculated && result && (
          <div className="space-y-3">
            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-primary/10 p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Total Assets</p>
                <p className="text-xs font-bold text-foreground">{fm(result.totalAssets)}</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Deductible Liabilities</p>
                <p className="text-xs font-bold text-destructive">{fm(result.totalLiabilities)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Net Zakatable Wealth</p>
                <p className="text-xs font-bold text-foreground">{fm(result.netWealth)}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">
                  Nisab ({result.nisabBasis === "gold" ? "Gold" : "Silver"})
                </p>
                <p className="text-xs font-bold text-foreground">
                  {result.nisabAmount > 0 ? fm(result.nisabAmount) : "Set price above"}
                </p>
              </div>
            </div>

            {/* Zakat Due */}
            <div className={`rounded-lg border p-3 text-center ${
              result.zakatDue
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-border/50 bg-muted/30"
            }`}>
              {result.nisabAmount <= 0 ? (
                <p className="text-xs text-warning font-medium">
                  Please enter gold/silver prices to determine nisab threshold
                </p>
              ) : result.zakatDue ? (
                <>
                  <p className="text-xs text-muted-foreground mb-1">Zakat Payable (2.5%)</p>
                  <p className="text-2xl font-bold text-emerald-500">{fm(result.zakatAmount)}</p>
                  <Badge className="mt-1.5 bg-emerald-500/20 text-emerald-400 text-[10px]">
                    Above Nisab — Zakat is due
                  </Badge>
                </>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mb-1">Zakat Status</p>
                  <p className="text-sm font-semibold text-foreground">Below Nisab Threshold</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Net wealth ({fm(result.netWealth)}) is below the nisab ({fm(result.nisabAmount)})
                  </p>
                </>
              )}
            </div>

            {/* Agricultural Zakat */}
            {showAgri && result.agriZakat > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">
                  Agricultural Zakat ({irrigationMethod === "natural" ? "10%" : "5%"})
                </p>
                <p className="text-lg font-bold text-amber-500">{fm(result.agriZakat)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Calculated separately from wealth zakat</p>
              </div>
            )}

            {/* Combined Total */}
            {result.zakatDue && showAgri && result.agriZakat > 0 && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Zakat Due</p>
                <p className="text-xl font-bold text-primary">{fm(result.zakatAmount + result.agriZakat)}</p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>Note:</strong> This calculator provides an estimate based on commonly used zakat rules.
                For personal religious guidance, please consult a qualified scholar. Zakat calculations may vary
                based on school of thought, local customs, and individual circumstances.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
