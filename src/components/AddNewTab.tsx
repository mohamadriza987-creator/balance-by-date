import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import type { Entry, Frequency, Investment, Subscription } from "@/lib/finance-types";
import { todayStr } from "@/lib/finance-utils";

type Mode = "income" | "expense" | "subscription" | "investment";

interface AddNewTabProps {
  onAddSubscription: (sub: Omit<Subscription, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => void;
  onAddInvestment: (inv: Omit<Investment, "id">) => void;
  incomeDescriptions?: string[];
  expenseDescriptions?: string[];
  subscriptionDescriptions?: string[];
  investmentDescriptions?: string[];
  incomeCategories?: string[];
  expenseCategories?: string[];
  subscriptionCategories?: string[];
  investmentCategories?: string[];
}

export function AddNewTab({
  onAddSubscription, onAddEntry, onAddInvestment,
  incomeDescriptions = [], expenseDescriptions = [], subscriptionDescriptions = [], investmentDescriptions = [],
  incomeCategories = [], expenseCategories = [], subscriptionCategories = [], investmentCategories = [],
}: AddNewTabProps) {
  const [mode, setMode] = useState<Mode>("expense");
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("10");

  const reset = () => {
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr());
    setCategory(""); setIsTrial(false); setTrialEndDate("");
    setEndDate(""); setExpectedReturn("10");
  };

  const descriptions = mode === "income" ? incomeDescriptions
    : mode === "expense" ? expenseDescriptions
    : mode === "subscription" ? subscriptionDescriptions
    : investmentDescriptions;

  const categories = mode === "income" ? incomeCategories
    : mode === "expense" ? expenseCategories
    : mode === "subscription" ? subscriptionCategories
    : investmentCategories;

  const isValid = useMemo(() => {
    if (!name.trim() || !amount || !date || !category.trim()) return false;
    if (mode === "subscription" && isTrial && !trialEndDate) return false;
    if (mode === "investment" && !endDate) return false;
    return true;
  }, [name, amount, date, category, mode, isTrial, trialEndDate, endDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    if (mode === "subscription") {
      onAddSubscription({
        name, amount: parseFloat(amount), frequency, nextDate: date,
        category: category || "General", includeInForecast: true,
        isTrial, trialEndDate: isTrial ? trialEndDate : undefined,
      });
    } else if (mode === "investment") {
      onAddInvestment({
        name, amount: parseFloat(amount), frequency, startDate: date,
        endDate, category: category || "General", includeInForecast: true,
        expectedReturn: parseInt(expectedReturn),
      });
    } else {
      onAddEntry({
        label: name,
        amount: mode === "expense" ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
        date, frequency, category: category || "General", includeInForecast: true,
      });
    }
    reset();
  };

  const modeLabel = mode === "subscription" ? "Subscription" : mode === "income" ? "Income" : mode === "investment" ? "Investment" : "Expense";

  return (
    <Card>
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Add New</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {(["income", "expense", "subscription", "investment"] as Mode[]).map((m) => (
              <Button key={m} type="button" variant={mode === m ? "default" : "outline"} size="sm"
                className="text-xs h-8 px-2"
                onClick={() => { setMode(m); reset(); }}>
                {m === "investment" ? "Goals" : m === "subscription" ? "Subs" : m.charAt(0).toUpperCase() + m.slice(1)}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">{mode === "subscription" ? "Service Name" : mode === "investment" ? "Investment Name" : "Description"} *</Label>
              <AutocompleteInput
                value={name} onChange={setName} suggestions={descriptions}
                placeholder={mode === "subscription" ? "e.g. Netflix" : mode === "investment" ? "e.g. Mutual Fund" : "e.g. Salary"}
                capitalize
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Amount ($) *</Label>
                <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Frequency *</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
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
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{mode === "subscription" ? "Next Billing" : mode === "investment" ? "Start Date" : "Date"} *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Category *</Label>
                <AutocompleteInput
                  value={category} onChange={setCategory} suggestions={categories}
                  placeholder="e.g. Entertainment" capitalize
                />
              </div>
            </div>

            {mode === "subscription" && (
              <>
                <div className="flex items-center gap-3">
                  <Switch checked={isTrial} onCheckedChange={setIsTrial} />
                  <Label className="text-xs">Free Trial</Label>
                </div>
                {isTrial && (
                  <div>
                    <Label className="text-xs">Trial End Date *</Label>
                    <Input type="date" value={trialEndDate} onChange={(e) => setTrialEndDate(e.target.value)} className="h-9" />
                  </div>
                )}
              </>
            )}

            {mode === "investment" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">End Date *</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Annual Return *</Label>
                  <Select value={expectedReturn} onValueChange={setExpectedReturn}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 41 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>{i}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!isValid}>
            Add {modeLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
