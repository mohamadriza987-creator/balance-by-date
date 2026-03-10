import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES_CURRENCIES } from "@/lib/constants";
import { AuthPage } from "@/components/AuthPage";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Heart, Search, UserPlus, Check, X } from "lucide-react";
import type { AccountType, UserProfile, AccountBalances } from "@/lib/finance-types";

interface IntroFlowProps {
  onComplete: (profile: UserProfile, balances: AccountBalances) => void;
  initialName?: string;
}

// Steps: 1=Name, 2=Auth, 3=Profile, 4=Country, 5=MaritalStatus, 6=SpouseInvite, 7=Sources
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const ACCOUNT_OPTIONS: { key: AccountType; label: string; emoji: string; placeholder: string }[] = [
  { key: "cash", label: "Cash", emoji: "💵", placeholder: "How much cash do you have?" },
  { key: "bank", label: "Bank", emoji: "🏦", placeholder: "Current bank balance" },
  { key: "creditCard", label: "Credit Card", emoji: "💳", placeholder: "Available credit limit" },
];

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];

const MARITAL_OPTIONS = [
  { value: "Single", label: "Single", emoji: "🚴", desc: "Riding solo", gradient: "from-blue-400/20 to-cyan-400/20 border-blue-300/40" },
  { value: "Committed", label: "Committed", emoji: "🌹", desc: "In a relationship", gradient: "from-rose-400/20 to-pink-400/20 border-rose-300/40" },
  { value: "Married", label: "Married", emoji: "💍", desc: "Happily together", gradient: "from-amber-400/20 to-yellow-400/20 border-amber-300/40" },
  { value: "Sweetie + kiddos", label: "Sweetie + kiddos", emoji: "👨‍👩‍👧‍👦", desc: "Family life", gradient: "from-green-400/20 to-emerald-400/20 border-green-300/40" },
  { value: "Prefer not to say", label: "Prefer not to say", emoji: "🤫", desc: "That's cool too", gradient: "from-purple-400/20 to-violet-400/20 border-purple-300/40" },
];

export function IntroFlow({ onComplete, initialName }: IntroFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(user ? 3 : 1);
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

  // Spouse invite
  const [spouseSearch, setSpouseSearch] = useState("");
  const [spouseSearchResult, setSpouseSearchResult] = useState<{ found: boolean; name?: string; finnyId?: string } | null>(null);
  const [spouseInviteSent, setSpouseInviteSent] = useState(false);
  const [searchingSpouse, setSearchingSpouse] = useState(false);

  // Sources
  const [balances, setBalances] = useState<Record<AccountType, string>>({ cash: "", bank: "", creditCard: "" });

  // Auto-detect location
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
      } catch { /* silent */ }
    };
    detectLocation();
  }, []);

  // Auto-advance when user logs in during auth step
  useEffect(() => {
    if (user && step === 2) {
      goToStep(3);
    }
  }, [user]);

  // Pre-fill from Google metadata
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

  // Auto-suggest FinnyUserID
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
          .from("profiles").select("id").eq("finny_user_id", alt).maybeSingle();
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
    setTimeout(() => { setStep(next); setTransitioning(false); }, 250);
  };

  const handleNameContinue = () => {
    if (!firstName.trim() || !lastName.trim()) return;
    if (user) goToStep(3);
    else goToStep(2);
  };

  const handleProfileContinue = () => {
    if (!finnyUserId.trim() || finnyAvailable === false) return;
    goToStep(4);
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
    goToStep(5);
  };

  const handleMaritalContinue = () => {
    if (!maritalStatus) return;
    if (maritalStatus === "Married") goToStep(6);
    else goToStep(7);
  };

  const handleSpouseContinue = () => goToStep(7);

  const searchSpouse = async () => {
    if (!spouseSearch.trim()) return;
    setSearchingSpouse(true);
    setSpouseSearchResult(null);
    const { data: found } = await supabase
      .from("profiles")
      .select("finny_user_id, first_name, last_name")
      .eq("finny_user_id", spouseSearch.trim().toLowerCase())
      .neq("user_id", user?.id || "")
      .maybeSingle();

    if (found) {
      setSpouseSearchResult({
        found: true,
        name: `${found.first_name || ""} ${found.last_name || ""}`.trim(),
        finnyId: found.finny_user_id || "",
      });
    } else {
      setSpouseSearchResult({ found: false });
    }
    setSearchingSpouse(false);
  };

  const sendSpouseInvite = async () => {
    if (!user || !spouseSearchResult?.finnyId) return;
    const { error } = await supabase.from("spouse_invitations").insert({
      from_user_id: user.id,
      to_finny_user_id: spouseSearchResult.finnyId,
      status: "pending",
    });
    if (error) {
      console.error("Spouse invite error:", error);
      setSpouseSearchResult(prev => prev ? { ...prev, found: false } : null);
      return;
    }
    setSpouseInviteSent(true);
  };

  // Sources: active = has a typed balance
  const enabledAccounts = ACCOUNT_OPTIONS
    .filter(({ key }) => balances[key] !== "" && !isNaN(parseFloat(balances[key])))
    .map(({ key }) => key);

  const canFinish = enabledAccounts.length > 0;

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
      country, currency, currencySymbol, enabledAccounts,
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
  const totalSteps = maritalStatus === "Married" ? 7 : 6;
  const currentVisualStep = step <= 2 ? step : (maritalStatus === "Married" ? step : (step > 5 ? step - 1 : step));

  return (
    <div className="min-h-screen bg-background finnyland-gradient flex flex-col items-center justify-center px-6 py-8">
      {/* Progress indicator */}
      {step > 1 && (
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i < currentVisualStep ? "w-6 bg-primary" : i === currentVisualStep ? "w-6 bg-primary/60" : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Step 1: Name ── */}
      {step === 1 && (
        <div className={`w-full max-w-sm space-y-8 text-center transition-all duration-300 ${animClass}`}>
          <div className="animate-float">
            <span className="text-5xl">🌿</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground font-display">Welcome to FinnyLand</h1>
            <p className="text-muted-foreground text-sm">Where Goals Grow Together</p>
          </div>
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">What should we call you?</p>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="text-center text-lg h-12 rounded-xl border-primary/20 focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && document.getElementById("intro-last-name")?.focus()}
              autoFocus
            />
            <Input
              id="intro-last-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="text-center text-lg h-12 rounded-xl border-primary/20 focus:border-primary"
              onKeyDown={(e) => e.key === "Enter" && handleNameContinue()}
            />
          </div>
          <Button onClick={handleNameContinue} disabled={!firstName.trim() || !lastName.trim()} className="w-full h-12 text-base rounded-xl">
            Let's Go 🌱
          </Button>
        </div>
      )}

      {/* ── Step 2: Auth ── */}
      {step === 2 && (
        <div className={`w-full transition-all duration-300 flex justify-center ${animClass}`}>
          <AuthPage userName={firstName.trim()} onBack={() => goToStep(1)} />
        </div>
      )}

      {/* ── Step 3: Profile Details ── */}
      {step === 3 && (
        <div className={`w-full max-w-sm space-y-5 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-1">
            <span className="text-3xl">👤</span>
            <h2 className="text-xl font-bold text-foreground font-display">Tell us about yourself</h2>
            <p className="text-sm text-muted-foreground">Let's personalize your FinnyLand</p>
          </div>

          {user?.email && (
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input value={user.email} disabled className="h-10 rounded-xl opacity-60" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">First Name</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="h-10 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} className="h-10 rounded-xl" />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Your FinnyUserID</Label>
            <div className="flex gap-2">
              <Input
                value={finnyUserId}
                onChange={e => { setFinnyUserId(e.target.value.toLowerCase().replace(/\s/g, "")); setFinnyAvailable(null); }}
                placeholder="e.g. mohamadriza"
                className="h-10 flex-1 rounded-xl"
              />
              <Button variant="outline" size="sm" className="h-10 text-xs rounded-xl"
                onClick={() => checkFinnyAvailability(finnyUserId)} disabled={!finnyUserId.trim() || checkingFinny}>
                {checkingFinny ? "..." : "Check"}
              </Button>
            </div>
            {finnyAvailable === true && <p className="text-xs text-success mt-1">✓ Available!</p>}
            {finnyAvailable === false && <p className="text-xs text-destructive mt-1">✗ Taken — we suggested an alternative.</p>}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Birthday</Label>
            <Input type="date" value={birthday} onChange={e => setBirthday(e.target.value)} className="h-10 rounded-xl" />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleProfileContinue} disabled={!finnyUserId.trim() || finnyAvailable === false} className="w-full h-12 text-base rounded-xl">
            Continue
          </Button>
        </div>
      )}

      {/* ── Step 4: Country — "You are here" ── */}
      {step === 4 && (
        <div className={`w-full max-w-sm space-y-5 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-2">
            <div className="relative inline-block">
              <div className="h-20 w-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-float">
                <MapPin className="h-10 w-10 text-primary" />
              </div>
              {country && (
                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full animate-scale-in">
                  📍
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-foreground font-display">You are here 📍</h2>
            <p className="text-sm text-muted-foreground">
              {detectedCountry ? `We think you're in ${detectedCountry}` : "Where in the world are you?"}
            </p>
          </div>

          {/* Country card */}
          {country && (
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center space-y-1 animate-scale-in">
              <p className="text-2xl">🌍</p>
              <p className="text-lg font-bold text-foreground">{country}</p>
              <p className="text-sm text-muted-foreground">{currency} ({currencySymbol})</p>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Country</Label>
            <Select value={country} onValueChange={handleCountrySelect}>
              <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Choose country" /></SelectTrigger>
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
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-10 rounded-xl" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Symbol</Label>
                <Input value={currencySymbol} onChange={(e) => setCurrencySymbol(e.target.value)} className="h-10 rounded-xl" />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-muted-foreground">Mobile Number (optional)</Label>
            <div className="flex gap-2">
              <Input value={phoneCode} onChange={e => setPhoneCode(e.target.value)} placeholder="+91" className="h-10 w-20 text-center rounded-xl" />
              <Input type="tel" inputMode="tel" value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Mobile number" className="h-10 flex-1 rounded-xl" />
            </div>
          </div>

          <Button onClick={handleCountryContinue} disabled={!country || !currency} className="w-full h-12 text-base rounded-xl">
            Continue
          </Button>
        </div>
      )}

      {/* ── Step 5: Marital Status ── */}
      {step === 5 && (
        <div className={`w-full max-w-sm space-y-6 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-foreground font-display">Which one feels most like you?</h2>
            <p className="text-sm text-muted-foreground">This helps us personalize your experience</p>
          </div>

          <div className="space-y-3">
            {MARITAL_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                onClick={() => setMaritalStatus(opt.value)}
                className={`w-full rounded-2xl border-2 p-4 flex items-center gap-4 transition-all duration-300 text-left
                  ${maritalStatus === opt.value
                    ? `bg-gradient-to-r ${opt.gradient} border-primary shadow-md scale-[1.02]`
                    : "border-border bg-card hover:border-primary/30 hover:bg-card/80"
                  }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className="text-3xl animate-float" style={{ animationDelay: `${i * 200}ms` }}>
                  {opt.emoji}
                </span>
                <div>
                  <p className="font-semibold text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
                {maritalStatus === opt.value && (
                  <Check className="h-5 w-5 text-primary ml-auto shrink-0 animate-scale-in" />
                )}
              </button>
            ))}
          </div>

          <Button onClick={handleMaritalContinue} disabled={!maritalStatus} className="w-full h-12 text-base rounded-xl">
            Continue
          </Button>
        </div>
      )}

      {/* ── Step 6: Spouse Invite (only if Married) ── */}
      {step === 6 && (
        <div className={`w-full max-w-sm space-y-6 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-2">
            <span className="text-4xl animate-float">💍</span>
            <h2 className="text-xl font-bold text-foreground font-display">
              Add your {gender === "Female" ? "husband" : gender === "Male" ? "wife" : "partner"} into FinnyLand
            </h2>
            <p className="text-sm text-muted-foreground italic">Grow together • Laugh together 💛</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <p className="text-sm text-foreground font-medium">Find them by their FinnyUserID</p>
            <div className="flex gap-2">
              <Input
                value={spouseSearch}
                onChange={e => setSpouseSearch(e.target.value.toLowerCase().replace(/\s/g, ""))}
                placeholder="Enter their FinnyUserID"
                className="h-10 flex-1 rounded-xl"
                onKeyDown={e => e.key === "Enter" && searchSpouse()}
              />
              <Button variant="outline" size="sm" className="h-10 rounded-xl" onClick={searchSpouse}
                disabled={!spouseSearch.trim() || searchingSpouse}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {spouseSearchResult && spouseSearchResult.found && !spouseInviteSent && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex items-center gap-3 animate-scale-in">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{spouseSearchResult.name}</p>
                  <p className="text-xs text-muted-foreground">@{spouseSearchResult.finnyId}</p>
                </div>
                <Button size="sm" className="rounded-xl text-xs" onClick={sendSpouseInvite}>
                  <UserPlus className="h-3.5 w-3.5 mr-1" /> Connect
                </Button>
              </div>
            )}

            {spouseSearchResult && !spouseSearchResult.found && (
              <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-center animate-scale-in">
                <p className="text-sm text-foreground">No user found with that ID</p>
                <p className="text-xs text-muted-foreground mt-1">You can invite them later from Settings</p>
              </div>
            )}

            {spouseInviteSent && (
              <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-center animate-scale-in">
                <p className="text-sm text-success font-medium">✓ Invitation sent!</p>
                <p className="text-xs text-muted-foreground mt-1">They'll see it when they log in</p>
              </div>
            )}
          </div>

          <Button onClick={handleSpouseContinue} variant={spouseInviteSent ? "default" : "outline"} className="w-full h-12 text-base rounded-xl">
            {spouseInviteSent ? "Continue" : "Skip for now"}
          </Button>
        </div>
      )}

      {/* ── Step 7: Sources ── */}
      {step === 7 && (
        <div className={`w-full max-w-sm space-y-6 transition-all duration-300 ${animClass}`}>
          <div className="text-center space-y-1">
            <span className="text-3xl">💰</span>
            <h2 className="text-xl font-bold text-foreground font-display">Which sources would you like to add?</h2>
            <p className="text-sm text-muted-foreground">Type a balance to activate a source</p>
          </div>

          <div className="space-y-3">
            {ACCOUNT_OPTIONS.map(({ key, label, emoji, placeholder }) => {
              const isActive = balances[key] !== "" && !isNaN(parseFloat(balances[key]));
              return (
                <div
                  key={key}
                  className={`rounded-2xl border-2 p-4 transition-all duration-300 ${
                    isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{emoji}</span>
                    <span className="font-semibold text-foreground">{label}</span>
                    {isActive && <Check className="h-4 w-4 text-primary ml-auto animate-scale-in" />}
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={balances[key]}
                    onChange={(e) => setBalances(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={`${currencySymbol} 0.00 — ${placeholder}`}
                    className="h-10 rounded-xl"
                  />
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Only sources with a balance will be activated
          </p>

          <Button onClick={handleFinish} disabled={!canFinish} className="w-full h-12 text-base rounded-xl">
            Let's Begin 🚀
          </Button>
        </div>
      )}
    </div>
  );
}
