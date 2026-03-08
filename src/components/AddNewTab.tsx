import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import type { Entry, Frequency, Subscription } from "@/lib/finance-types";
import { todayStr } from "@/lib/finance-utils";

type Mode = "income" | "expense" | "subscription";

interface AddNewTabProps {
  onAddSubscription: (sub: Omit<Subscription, "id">) => void;
  onAddEntry: (entry: Omit<Entry, "id">) => void;
  incomeDescriptions?: string[];
  expenseDescriptions?: string[];
  subscriptionDescriptions?: string[];
  incomeCategories?: string[];
  expenseCategories?: string[];
  subscriptionCategories?: string[];
}

export function AddNewTab({
  onAddSubscription, onAddEntry,
  incomeDescriptions = [], expenseDescriptions = [], subscriptionDescriptions = [],
  incomeCategories = [], expenseCategories = [], subscriptionCategories = [],
}: AddNewTabProps) {
  const [mode, setMode] = useState<Mode>("expense");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");

  // Subscription-specific
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState("");

  const reset = () => {
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr());
    setCategory(""); setIsTrial(false); setTrialEndDate("");
  };

  const descriptions = mode === "income" ? incomeDescriptions : mode === "expense" ? expenseDescriptions : subscriptionDescriptions;
  const categories = mode === "income" ? incomeCategories : mode === "expense" ? expenseCategories : subscriptionCategories;

  const isValid = useMemo(() => {
    if (!name.trim() || !amount || !date || !category.trim()) return false;
    if (mode === "subscription" && isTrial && !trialEndDate) return false;
    return true;
  }, [name, amount, date, category, mode, isTrial, trialEndDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    if (mode === "subscription") {
      onAddSubscription({
        name,
        amount: parseFloat(amount),
        frequency,
        nextDate: date,
        category: category || "General",
        includeInForecast: true,
        isTrial,
        trialEndDate: isTrial ? trialEndDate : undefined,
      });
    } else {
      onAddEntry({
        label: name,
        amount: mode === "expense" ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
        date,
        frequency,
        category: category || "General",
        includeInForecast: true,
      });
    }
    reset();
  };

  const modeLabel = mode === "subscription" ? "Subscription" : mode === "income" ? "Income" : "Expense";

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-lg">Add New</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mode buttons */}
          <div className="flex gap-2">
            <Button type="button" variant={mode === "income" ? "default" : "outline"} size="sm" onClick={() => { setMode("income"); reset(); }}>
              Income
            </Button>
            <Button type="button" variant={mode === "expense" ? "default" : "outline"} size="sm" onClick={() => { setMode("expense"); reset(); }}>
              Expense
            </Button>
            <Button type="button" variant={mode === "subscription" ? "default" : "outline"} size="sm" onClick={() => { setMode("subscription"); reset(); }}>
              Subscription
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{mode === "subscription" ? "Service Name" : "Description"} <span className="text-destructive">*</span></Label>
              <AutocompleteInput
                id="name"
                value={name}
                onChange={setName}
                suggestions={descriptions}
                placeholder={mode === "subscription" ? "e.g. Netflix" : "e.g. Salary"}
                capitalize
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount ($) <span className="text-destructive">*</span></Label>
                <Input id="amount" type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label htmlFor="freq">Frequency <span className="text-destructive">*</span></Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">{mode === "subscription" ? "Next Billing Date" : "Date"} <span className="text-destructive">*</span></Label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                <AutocompleteInput
                  id="category"
                  value={category}
                  onChange={setCategory}
                  suggestions={categories}
                  placeholder="e.g. Entertainment"
                  capitalize
                />
              </div>
            </div>

            {mode === "subscription" && (
              <>
                <div className="flex items-center gap-3">
                  <Switch checked={isTrial} onCheckedChange={setIsTrial} />
                  <Label>Free Trial</Label>
                </div>
                {isTrial && (
                  <div>
                    <Label htmlFor="trialEnd">Trial End Date <span className="text-destructive">*</span></Label>
                    <Input id="trialEnd" type="date" value={trialEndDate} onChange={(e) => setTrialEndDate(e.target.value)} />
                  </div>
                )}
              </>
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
