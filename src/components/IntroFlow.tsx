import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES_CURRENCIES } from "@/lib/constants";
import { AuthPage } from "@/components/AuthPage";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import type { AccountType, UserProfile, AccountBalances } from "@/lib/finance-types";

interface IntroFlowProps {
  onComplete: (profile: UserProfile, balances: AccountBalances) => void;
  initialName?: string;
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const ACCOUNT_OPTIONS: { key: AccountType; label: string; creditLabel?: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
  { key: "creditCard", label: "Credit Card", creditLabel: "Credit Card Limit Available" },
];

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed", "Prefer not to say"];

export function IntroFlow({ onComplete, initialName }: IntroFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(user ? 4 : 1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [transitioning, setTransitioning] = useState(false);

  // Profile fields
  const [birthday, setBirthday] = useState("");
  const [finnyUserId, setFinnyUserId] = useState("");
  const [finnyAvailable, setFinnyAvailable] = useState<boolean | null>(null);
  const [checkingFinny, setCheckingFinny] = useState(false);
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  // Country/Currency
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [detectedCountry, setDetectedCountry] = useState("");

  // Sources
  const [enabledAccounts, setEnabledAccounts] = useState<AccountType[]>([]);
  const [balances, setBalances] = useState<Record<AccountType, string>>({ cash: "", bank: "", creditCard: "" });

  // Auto-detect location on mount
  useEffect(() => {
    const detectLocation = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        if (data.country_name) {
          const match = COUNTRIES_CURRENCIES.find(
            cc => cc.country.toLowerCase() === data.country_name.toLowerCase()
          );
          if (match) {
            setDetectedCountry(match.country);
            setCountry(match.country);
            setCurrency(match.currency);
            setCurrencySymbol(match.symbol);
            setPhoneCode(match.phoneCode);
          }
        }
      } catch {
        // Silently fail - user can select manually
      }
    };
    detectLocation();
  }, []);

  // When user logs in (e.g. from auth step 3), advance to profile step
  useEffect(() => {
    if (user && step === 3) {
      goToStep(4);
    }
  }, [user]);

  // Pre-fill from Google user metadata
  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {};
      if (meta.full_name || meta.name) {
        const fullName = (meta.full_name || meta.name || "").trim();
        const parts = fullName.split(" ");
        if (!firstName && parts[0]) setFirstName(parts[0]);
        if (!lastName && parts.length > 1) setLastName(parts.slice(1).join(" "));
      }
      if (meta.first_name && !firstName) setFirstName(meta.first_name);
      if (meta.last_name && !lastName) setLastName(meta.last_name);
    }
  }, [user]);

  // Auto-suggest FinnyUserID when first/last name changes
  useEffect(() => {
    if (firstName.trim() && lastName.trim()) {
      const suggested = (firstName.trim() + lastName.trim()).replace(/\s+/g, "").toLowerCase();
      setFinnyUserId(suggested);
      setFinnyAvailable(null);
    }
  }, [firstName, lastName]);

  const checkFinnyAvailability = async (id: string) => {
    if (!id.trim()) return;
    setCheckingFinny(true);
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("finny_user_id", id.trim().toLowerCase())
      .neq("user_id", user?.id || "")
      .maybeSingle();
    
    if (existing) {
      setFinnyAvailable(false);
      for (let i = 1; i <= 99; i++) {
        const alt = `${id.trim().toLowerCase()}${i}`;
        const { data: altExisting } = await supabase
          .from("profiles")
          .select("id")
          .eq("finny_user_id", alt)
          .maybeSingle();
        if (!altExisting) {
          setFinnyUserId(alt);
          setFinnyAvailable(true);
          break;
        }
      }
    } else {
      setFinnyAvailable(true);
    }
    setCheckingFinny(false);
  };

  const goToStep = (next: Step) => {
    setTransitioning(true);
    setTimeout(() => {
      setStep(next);
      setTransitioning(false);
    }, 300);
  };

  const handleNameContinue = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    goToStep(2);
  };

  const handleWelcomeContinue = () => {
    if (user) {
      goToStep(4);
    } else {
      goToStep(3);
    }
  };

  const handleProfileContinue = () => {
    if (!finnyUserId.trim() || finnyAvailable === false) return;
    goToStep(5);
  };

  const handleCountrySelect = (c: string) => {
    setCountry(c);
    const match = COUNTRIES_CURRENCIES.find(cc => cc.country === c);
    if (match) {
      setCurrency(match.currency);
      setCurrencySymbol(match.symbol);
      setPhoneCode(match.phoneCode);
    }
  };

  const handleCountryContinue = () => {
    if (!country || !currency) return;
    goToStep(6);
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

  const handleFinish = async () => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const profile: UserProfile = {
      name: fullName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthday: birthday || undefined,
      finnyUserId: finnyUserId.trim().toLowerCase() || undefined,
      gender: gender || undefined,
      maritalStatus: maritalStatus || undefined,
      phoneCode: phoneCode || undefined,
      phoneNumber: phoneNumber || undefined,
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

    if (user) {
      await supabase.from("profiles").update({
        name: profile.name,
        first_name: profile.firstName,
        last_name: profile.lastName,
        birthday: profile.birthday || null,
        finny_user_id: profile.finnyUserId || null,
        gender: profile.gender || null,
        marital_status: profile.maritalStatus || null,
        phone_code: profile.phoneCode || null,
        phone_number: profile.phoneNumber || null,
        country: profile.country,
        currency: profile.currency,
        currency_symbol: profile.currencySymbol,
        enabled_accounts: profile.enabledAccounts,
        onboarding_complete: true,
      }).eq("user_id", user.id);
    }

    onComplete(profile, accountBalances);
  };

  const animClass = transitioning ? "opacity-0 translate-y-4" : "animate-fade-in";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      {/* Step 1: Name */}
      {step === 1 && (
        <div className={`w-full max-w-sm space-y-8 text-center transition-all duration-300 ${animClass}`}>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Welcome to FinnyLand 🌿</h1>
          </div>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">Tell us your name</p>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="text-center text-lg h-12"
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("intro-last-name")?.focus()}
              autoFocus
            />
            <Input
              id="intro-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="text-center text-lg h-12"
              onKeyDown={(e) => e.key === "Enter" && handleNameContinue()}
            />
          </div>
          <Button onClick={handleNameContinue} disabled={!firstName.trim() || !lastName.trim()} className="w-full h-12 text-base">
            Continue
          </Button>
        </div>
      )}

      {/* Step 2: Welcome message */}
      {step === 2 && (
        <div className={`w-full max-w-sm space-y-8 text-center transition-all duration-300 ${animClass}`}>
          <div className="flex justify-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
                <span className="text-3xl">✨</span>
              </div>
              <div className="absolute -inset-2 rounded-full border border-primary/20 animate-[pulse_3s_ease-in-out_infinite]" />
            </div>
          </div>
          <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur p-6 space-y-4 shadow-lg animate-fade-in">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
            <p className="relative text-lg font-medium text-foreground">
              Hii <span className="text-primary font-semibold italic">{firstName.trim()}</span> 👋
            </p>
            <div className="relative h-px w-12 mx-auto bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <p className="relative text-sm leading-relaxed text-muted-foreground italic">
              Welcome to FinnyLand — where your financial goals grow together. Let's set up your personal space!
            </p>
            <div className="relative pt-2">
              <p className="text-xs text-muted-foreground/70 tracking-wide uppercase">
                Crafted with 💛 by
              </p>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                Mohamad Riza
              </p>
            </div>
          </div>
          <Button onClick={handleWelcomeContinue} className="w-full h-12 text-base font-medium animate-fade-in">
            Continue
          </Button>
        </div>
      )}

      {/* Step 3: Auth */}
      {step === 3 && (
        <div className={`w-full transition-all duration-300 flex justify-center ${animClass}`}>
          <AuthPage userName={firstName.trim()} onBack={() => goToStep(2)} />
        </div>
      )}

      {/* Step 4: Profile Details - logically organized */}
      {step === 4 && (
        <div className={`w-full max-w-sm space-y-5 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Tell us about yourself</h2>
            <p className="text-sm text-muted-foreground">Let's personalize your experience</p>
          </div>

          {/* Email (read-only from auth) */}
          {user?.email && (
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={user.email} disabled className="h-10 opacity-60" />
            </div>
          )}

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-10" />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-10" />
            </div>
          </div>

          {/* FinnyUserID */}
          <div>
            <Label className="text-xs">Your FinnyUserID</Label>
            <div className="flex gap-2">
              <Input
                value={finnyUserId}
                onChange={e => { setFinnyUserId(e.target.value.toLowerCase().replace(/\s/g, "")); setFinnyAvailable(null); }}
                placeholder="e.g. mohamadriza"
                className="h-10 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-10 text-xs"
                onClick={() => checkFinnyAvailability(finnyUserId)}
                disabled={!finnyUserId.trim() || checkingFinny}
              >
                {checkingFinny ? "..." : "Check"}
              </Button>
            </div>
            {finnyAvailable === true && (
              <p className="text-xs text-success mt-1">✓ Available!</p>
            )}
            {finnyAvailable === false && (
              <p className="text-xs text-destructive mt-1">✗ Already taken. We've suggested an alternative above.</p>
            )}
          </div>

          {/* Birthday */}
          <div>
            <Label className="text-xs">Birthday</Label>
            <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="h-10" />
          </div>

          {/* Gender & Marital Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {GENDER_OPTIONS.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Marital Status</Label>
              <Select value={maritalStatus} onValueChange={setMaritalStatus}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleProfileContinue} disabled={!finnyUserId.trim() || finnyAvailable === false} className="w-full h-12 text-base">
            Continue
          </Button>
        </div>
      )}

      {/* Step 5: Country/Currency/Phone */}
      {step === 5 && (
        <div className={`w-full max-w-sm space-y-5 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground">Location & Contact</h2>
            <p className="text-sm text-muted-foreground">
              {detectedCountry ? `We detected you're in ${detectedCountry}` : "Select your country"}
            </p>
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

            {/* Mobile Number */}
            <div>
              <Label className="text-xs">Mobile Number (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={phoneCode}
                  onChange={e => setPhoneCode(e.target.value)}
                  placeholder="+91"
                  className="h-10 w-20 text-center"
                />
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phoneNumber}
                  onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="Mobile number"
                  className="h-10 flex-1"
                />
              </div>
            </div>
          </div>
          <Button onClick={handleCountryContinue} disabled={!country || !currency} className="w-full h-12 text-base">
            Continue
          </Button>
        </div>
      )}

      {/* Step 6: Source selection */}
      {step === 6 && (
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
