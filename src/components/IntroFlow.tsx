import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES_CURRENCIES } from "@/lib/constants";
import type { AccountType, UserProfile, AccountBalances } from "@/lib/finance-types";

interface IntroFlowProps {
  onComplete: (profile: UserProfile, balances: AccountBalances) => void;
}

type Step = 1 | 2 | 3 | 4;

const ACCOUNT_OPTIONS: { key: AccountType; label: string; creditLabel?: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
  { key: "creditCard", label: "Credit Card", creditLabel: "Credit Card Limit Available" },
];

export function IntroFlow({ onComplete }: IntroFlowProps) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  // Country/Currency
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("$");

  // Sources
  const [enabledAccounts, setEnabledAccounts] = useState<AccountType[]>([]);
  const [balances, setBalances] = useState<Record<AccountType, string>>({ cash: "", bank: "", creditCard: "" });

  const goToStep = (next: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 300);
  };

  const handleNameContinue = () => {
    if (!name.trim()) return;
    goToStep(2);
  };

  const handleWelcomeContinue = () => {
    goToStep(3);
  };

  const handleCountrySelect = (c: string) => {
    setCountry(c);
    const match = COUNTRIES_CURRENCIES.find(cc => cc.country === c);
    if (match) {
      setCurrency(match.currency);
      setCurrencySymbol(match.symbol);
    }
  };

  const handleCountryContinue = () => {
    if (!country || !currency) return;
    goToStep(4);
  };

  const toggleAccount = (acc: AccountType) => {
    setEnabledAccounts(prev =>
      prev.includes(acc) ? prev.filter(a => a !== acc) : [...prev, acc]
    );
  };

  const allBalancesFilled = enabledAccounts.length > 0 && enabledAccounts.every(acc => {
    const val = balances[acc];
    return val !== "" && !isNaN(parseFloat(val));
  });

  const handleFinish = () => {
    localStorage.setItem("finance-buddy-intro-done", "true");
    const profile: UserProfile = {
      name: name.trim(),
      country,
      currency,
      currencySymbol,
      enabledAccounts,
    };
    const accountBalances: AccountBalances = {
      cash: enabledAccounts.includes("cash") ? parseFloat(balances.cash) || 0 : 0,
      bank: enabledAccounts.includes("bank") ? parseFloat(balances.bank) || 0 : 0,
      creditCard: enabledAccounts.includes("creditCard") ? parseFloat(balances.creditCard) || 0 : 0,
    };
    onComplete(profile, accountBalances);
  };

  const animClass = transitioning ? "opacity-0 translate-y-4" : "animate-fade-in";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      {step === 1 && (
        <div className={`w-full max-w-sm space-y-8 text-center transition-all duration-300 ${animClass}`}>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Heyloo buddy, welcome 💛</h1>
          </div>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">What should I call you?</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="text-center text-lg h-12"
              onKeyDown={(e) => e.key === "Enter" && handleNameContinue()}
              autoFocus
            />
          </div>
          <Button onClick={handleNameContinue} disabled={!name.trim()} className="w-full h-12 text-base">
            Continue
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className={`w-full max-w-sm space-y-6 text-center transition-all duration-300 ${animClass}`}>
          <div className="rounded-xl border border-border bg-card p-5 space-y-4 text-sm leading-relaxed text-foreground/90">
            <p>Hii {name.trim()} .. this is your personal financial planner app here.. Developed by Mohamad Riza</p>
          </div>
          <Button onClick={handleWelcomeContinue} className="w-full h-12 text-base">
            Continue
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className={`w-full max-w-sm space-y-6 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Select your country</h2>
            <p className="text-sm text-muted-foreground">We'll set the default currency for you</p>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Select value={country} onValueChange={handleCountrySelect}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Choose country" /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {COUNTRIES_CURRENCIES.map(cc => (
                    <SelectItem key={cc.country} value={cc.country}>{cc.country}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {country && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10" />
                </div>
                <div>
                  <Label className="text-xs">Symbol</Label>
                  <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="h-10" />
                </div>
              </div>
            )}
          </div>

          <Button onClick={handleCountryContinue} disabled={!country || !currency} className="w-full h-12 text-base">
            Continue
          </Button>
        </div>
      )}

      {step === 4 && (
        <div className={`w-full max-w-sm space-y-6 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Which sources would you like to add?</h2>
            <p className="text-sm text-muted-foreground">Select your accounts and enter current balances</p>
          </div>

          <div className="space-y-4">
            {ACCOUNT_OPTIONS.map(({ key, label, creditLabel }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={`acc-${key}`}
                    checked={enabledAccounts.includes(key)}
                    onCheckedChange={() => toggleAccount(key)}
                  />
                  <Label htmlFor={`acc-${key}`} className="text-sm font-medium cursor-pointer">
                    {key === "creditCard" ? "Credit Card" : label}
                  </Label>
                </div>
                {enabledAccounts.includes(key) && (
                  <div className="ml-7">
                    <Label className="text-xs text-muted-foreground">
                      {key === "creditCard" ? (creditLabel || "Credit Card Limit Available") : `Current ${label} Balance`}
                    </Label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={balances[key]}
                      onChange={(e) => setBalances(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`${currencySymbol} 0.00`}
                      className="h-9 mt-1"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <Button onClick={handleFinish} disabled={!allBalancesFilled} className="w-full h-12 text-base">
            Let's Begin
          </Button>
        </div>
      )}
    </div>
  );
}
