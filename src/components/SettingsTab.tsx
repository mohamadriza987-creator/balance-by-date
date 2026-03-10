import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Upload, RotateCcw, Heart, CreditCard, ArrowLeftRight, LogOut, User, Landmark, Wallet, Pencil, Check, X } from "lucide-react";
import type { AppData, AppSettings, AccountType, AccountBalances } from "@/lib/finance-types";
import { seedData, addDays, todayStr, daysBetween } from "@/lib/finance-utils";
import { getSettings } from "@/lib/account-forecast";
import { COUNTRIES_CURRENCIES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

interface SettingsTabProps {
  data: AppData;
  onReplace: (data: AppData) => void;
  onUpdateForecastDate: (date: string) => void;
  onReplayIntro?: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
  onUpdateAccountBalances?: (balances: AccountBalances) => void;
}

const ALL_ACCOUNTS: { key: AccountType; label: string }[] = [
  { key: "cash", label: "Cash" },
  { key: "bank", label: "Bank" },
  { key: "creditCard", label: "Credit Card" },
];

const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Divorced", "Widowed", "Prefer not to say"];

interface ProfileData {
  first_name?: string;
  last_name?: string;
  birthday?: string;
  finny_user_id?: string;
  gender?: string;
  marital_status?: string;
  phone_code?: string;
  phone_number?: string;
  country?: string;
  currency?: string;
  currency_symbol?: string;
}

export function SettingsTab({ data, onReplace, onUpdateForecastDate, onReplayIntro, onUpdateSettings, onUpdateAccountBalances }: SettingsTabProps) {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = getSettings(data);

  const today = data.positionDate || todayStr();
  const horizonDays = Math.max(daysBetween(today, data.forecastDate), 30);
  const horizonMonths = Math.round(horizonDays / 30);

  const enabledAccounts = data.userProfile?.enabledAccounts || [];
  const [newAccountBalance, setNewAccountBalance] = useState("");

  const [profileData, setProfileData] = useState<ProfileData>({});
  const [editingProfile, setEditingProfile] = useState(false);
  const [editFields, setEditFields] = useState<ProfileData>({});

  // Load profile data
  useEffect(() => {
    if (user) {
      supabase.from("profiles")
        .select("first_name, last_name, birthday, finny_user_id, gender, marital_status, phone_code, phone_number, country, currency, currency_symbol")
        .eq("user_id", user.id).maybeSingle().then(({ data: p }) => {
          if (p) setProfileData(p as ProfileData);
        });
    }
  }, [user]);

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balancebydate-export-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Data exported", description: "JSON file downloaded successfully." });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target?.result as string) as AppData;
        if (!imported.entries || !imported.subscriptions || imported.currentBalance === undefined) {
          throw new Error("Invalid format");
        }
        onReplace(imported);
        toast({ title: "Data imported", description: `Loaded ${imported.entries.length} entries and ${imported.subscriptions.length} subscriptions.` });
      } catch {
        toast({ title: "Import failed", description: "The file doesn't appear to be a valid BalanceByDate export.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReset = () => {
    onReplace(seedData());
    toast({ title: "Data reset", description: "All data has been reset to defaults." });
  };

  const handleHorizonChange = (months: number[]) => {
    const days = months[0] * 30;
    onUpdateForecastDate(addDays(today, days));
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Signed out", description: "You've been logged out successfully." });
  };

  const handleToggleAccount = async (acc: AccountType) => {
    const current = [...enabledAccounts];
    let updatedAccounts: AccountType[];
    if (current.includes(acc)) {
      if (current.length <= 1) {
        toast({ title: "Cannot remove", description: "You need at least one account enabled.", variant: "destructive" });
        return;
      }
      updatedAccounts = current.filter(a => a !== acc);
    } else {
      updatedAccounts = [...current, acc];
      const bal = parseFloat(newAccountBalance) || 0;
      if (onUpdateAccountBalances) {
        const newBalances = { ...data.accountBalances, [acc]: bal };
        onUpdateAccountBalances(newBalances);
      }
      setNewAccountBalance("");
    }

    const updatedProfile = { ...data.userProfile, enabledAccounts: updatedAccounts };
    onReplace({ ...data, userProfile: updatedProfile });

    if (user) {
      await supabase.from("profiles").update({
        enabled_accounts: updatedAccounts,
      }).eq("user_id", user.id);
    }

    toast({ title: current.includes(acc) ? "Account removed" : "Account added", description: `${acc === "creditCard" ? "Credit Card" : acc === "bank" ? "Bank" : "Cash"} ${current.includes(acc) ? "removed" : "added"}.` });
  };

  const startEditing = () => {
    setEditFields({ ...profileData });
    setEditingProfile(true);
  };

  const cancelEditing = () => {
    setEditingProfile(false);
    setEditFields({});
  };

  const handleEditCountryChange = (c: string) => {
    const match = COUNTRIES_CURRENCIES.find(cc => cc.country === c);
    setEditFields(prev => ({
      ...prev,
      country: c,
      currency: match?.currency || prev.currency,
      currency_symbol: match?.symbol || prev.currency_symbol,
      phone_code: match?.phoneCode || prev.phone_code,
    }));
  };

  const saveProfile = async () => {
    if (!user) return;
    // Only save editable fields (not name, username, birthday, gender)
    const updates: Record<string, unknown> = {
      marital_status: editFields.marital_status || null,
      phone_code: editFields.phone_code || null,
      phone_number: editFields.phone_number || null,
      country: editFields.country || null,
      currency: editFields.currency || null,
      currency_symbol: editFields.currency_symbol || null,
    };

    await supabase.from("profiles").update(updates).eq("user_id", user.id);

    setProfileData(prev => ({ ...prev, ...updates } as ProfileData));
    setEditingProfile(false);

    // Also update local userProfile
    if (editFields.country || editFields.currency) {
      const updatedProfile = {
        ...data.userProfile,
        country: editFields.country || data.userProfile?.country || "",
        currency: editFields.currency || data.userProfile?.currency || "",
        currencySymbol: editFields.currency_symbol || data.userProfile?.currencySymbol || "$",
        phoneCode: editFields.phone_code || undefined,
        phoneNumber: editFields.phone_number || undefined,
        maritalStatus: editFields.marital_status || undefined,
      };
      onReplace({ ...data, userProfile: updatedProfile as any });
    }

    toast({ title: "Profile updated" });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" /> Profile
              </CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </div>
            {!editingProfile ? (
              <Button variant="ghost" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={saveProfile}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEditing}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {user && (
            <div className="space-y-3">
              {/* Read-only fields */}
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Email</Label>
                <span className="text-sm text-foreground">{user.email}</span>
              </div>

              {(profileData.first_name || profileData.last_name) && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Name</Label>
                  <span className="text-sm text-foreground">{profileData.first_name} {profileData.last_name}</span>
                </div>
              )}

              {profileData.finny_user_id && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Username</Label>
                  <span className="text-sm text-foreground font-mono">@{profileData.finny_user_id}</span>
                </div>
              )}

              {profileData.birthday && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Birthday</Label>
                  <span className="text-sm text-foreground">{profileData.birthday}</span>
                </div>
              )}

              {profileData.gender && (
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Gender</Label>
                  <span className="text-sm text-foreground">{profileData.gender}</span>
                </div>
              )}

              {/* Editable fields */}
              {!editingProfile ? (
                <>
                  {profileData.marital_status && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Marital Status</Label>
                      <span className="text-sm text-foreground">{profileData.marital_status}</span>
                    </div>
                  )}
                  {(profileData.phone_code || profileData.phone_number) && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Mobile</Label>
                      <span className="text-sm text-foreground">{profileData.phone_code} {profileData.phone_number}</span>
                    </div>
                  )}
                  {(profileData.country || data.userProfile?.country) && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Country</Label>
                      <span className="text-sm text-foreground">{profileData.country || data.userProfile?.country}</span>
                    </div>
                  )}
                  {(profileData.currency || data.userProfile?.currency) && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Currency</Label>
                      <span className="text-sm text-foreground">{profileData.currency_symbol || data.userProfile?.currencySymbol} ({profileData.currency || data.userProfile?.currency})</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="border-t border-border pt-3 mt-2">
                    <p className="text-xs text-muted-foreground mb-3">✏️ Editable fields below</p>
                  </div>

                  <div>
                    <Label className="text-xs">Marital Status</Label>
                    <Select value={editFields.marital_status || ""} onValueChange={v => setEditFields(p => ({ ...p, marital_status: v }))}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {MARITAL_STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Mobile Number</Label>
                    <div className="flex gap-2">
                      <Input
                        value={editFields.phone_code || ""}
                        onChange={e => setEditFields(p => ({ ...p, phone_code: e.target.value }))}
                        placeholder="+91"
                        className="h-9 w-20 text-center"
                      />
                      <Input
                        type="tel"
                        inputMode="tel"
                        value={editFields.phone_number || ""}
                        onChange={e => setEditFields(p => ({ ...p, phone_number: e.target.value.replace(/[^0-9]/g, "") }))}
                        placeholder="Mobile number"
                        className="h-9 flex-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Country</Label>
                    <Select value={editFields.country || ""} onValueChange={handleEditCountryChange}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Choose" /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {COUNTRIES_CURRENCIES.map(cc => (
                          <SelectItem key={cc.country} value={cc.country}>{cc.country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Currency</Label>
                      <Input value={editFields.currency || ""} onChange={e => setEditFields(p => ({ ...p, currency: e.target.value }))} className="h-9" />
                    </div>
                    <div>
                      <Label className="text-xs">Symbol</Label>
                      <Input value={editFields.currency_symbol || ""} onChange={e => setEditFields(p => ({ ...p, currency_symbol: e.target.value }))} className="h-9" />
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Manage Accounts / Wallets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5" /> Manage Accounts
          </CardTitle>
          <CardDescription>Add or remove money sources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ALL_ACCOUNTS.map(({ key, label }) => {
            const isEnabled = enabledAccounts.includes(key);
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`settings-acc-${key}`}
                      checked={isEnabled}
                      onCheckedChange={() => {
                        if (isEnabled) {
                          handleToggleAccount(key);
                        }
                      }}
                      disabled={isEnabled && enabledAccounts.length <= 1}
                    />
                    <Label htmlFor={`settings-acc-${key}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                  {!isEnabled && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        inputMode="decimal"
                        placeholder="Balance"
                        value={newAccountBalance}
                        onChange={(e) => setNewAccountBalance(e.target.value)}
                        className="h-8 w-24 text-xs"
                      />
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleToggleAccount(key)}>
                        Add
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground">Only enabled accounts appear in dropdowns across the app.</p>
        </CardContent>
      </Card>


      {/* Credit Card Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Credit Card
          </CardTitle>
          <CardDescription>Configure credit card billing behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Bill Payment Day</Label>
            <p className="text-xs text-muted-foreground mb-2">Day of month when CC bill is settled from Bank</p>
            <Select
              value={String(settings.creditCardBillDay)}
              onValueChange={(v) => onUpdateSettings?.({ creditCardBillDay: parseInt(v) })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1, 5, 10, 15, 20, 25, 28].map(d => (
                  <SelectItem key={d} value={String(d)}>{d}th of every month</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Include CC in Balance</Label>
              <p className="text-xs text-muted-foreground">Show credit card limit in top balance</p>
            </div>
            <Switch
              checked={settings.includeCreditCardInBalance}
              onCheckedChange={(v) => onUpdateSettings?.({ includeCreditCardInBalance: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Transfer Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" /> Transfer Suggestions
          </CardTitle>
          <CardDescription>Configure internal transfer recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Enable Suggestions</Label>
              <p className="text-xs text-muted-foreground">Auto-recommend transfers for shortfalls</p>
            </div>
            <Switch
              checked={settings.transferSuggestionsEnabled}
              onCheckedChange={(v) => onUpdateSettings?.({ transferSuggestionsEnabled: v })}
            />
          </div>
          <div>
            <Label className="text-sm">Lead Time (days before due)</Label>
            <p className="text-xs text-muted-foreground mb-2">When to suggest making the transfer</p>
            <Select
              value={String(settings.transferLeadDays)}
              onValueChange={(v) => onUpdateSettings?.({ transferLeadDays: parseInt(v) })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Same day</SelectItem>
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="2">2 days before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Zakat & Investment Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Landmark className="h-5 w-5" /> Zakat & Investments
          </CardTitle>
          <CardDescription>Defaults for calculators in the Forecast tab</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm">Preferred Nisab Basis</Label>
            <p className="text-xs text-muted-foreground mb-2">Used as default in the Zakat calculator</p>
            <Select
              value={settings.preferredNisabBasis || "silver"}
              onValueChange={(v) => onUpdateSettings?.({ preferredNisabBasis: v as "gold" | "silver" })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gold">Gold (87.48g)</SelectItem>
                <SelectItem value="silver">Silver (612.36g)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Default Gold Price/g</Label>
              <Input
                type="number" inputMode="decimal" placeholder="Manual price"
                value={settings.defaultGoldPrice || ""}
                onChange={e => onUpdateSettings?.({ defaultGoldPrice: e.target.value })}
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-sm">Default Silver Price/g</Label>
              <Input
                type="number" inputMode="decimal" placeholder="Manual price"
                value={settings.defaultSilverPrice || ""}
                onChange={e => onUpdateSettings?.({ defaultSilverPrice: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm">Default Compounding Frequency</Label>
            <p className="text-xs text-muted-foreground mb-2">Used in the Investment calculator</p>
            <Select
              value={settings.defaultCompoundingFrequency || "monthly"}
              onValueChange={(v) => onUpdateSettings?.({ defaultCompoundingFrequency: v as "monthly" | "halfyearly" | "annually" })}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="halfyearly">Half-Yearly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Data Management</CardTitle>
          <CardDescription>Export, import, or reset your financial data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" /> Export as JSON
          </Button>

          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" className="w-full justify-start gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import from JSON
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full justify-start gap-2">
                <RotateCcw className="h-4 w-4" /> Reset All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will clear all your entries, subscriptions, and balances. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {onReplayIntro && (
            <Button variant="outline" className="w-full justify-start gap-2" onClick={onReplayIntro}>
              <Heart className="h-4 w-4" /> Replay intro message
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
