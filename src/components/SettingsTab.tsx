import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Upload, RotateCcw, Heart, CreditCard, ArrowLeftRight } from "lucide-react";
import type { AppData, AppSettings } from "@/lib/finance-types";
import { seedData, addDays, todayStr, daysBetween } from "@/lib/finance-utils";
import { getSettings } from "@/lib/account-forecast";
import { useToast } from "@/hooks/use-toast";

interface SettingsTabProps {
  data: AppData;
  onReplace: (data: AppData) => void;
  onUpdateForecastDate: (date: string) => void;
  onReplayIntro?: () => void;
  onUpdateSettings?: (updates: Partial<AppSettings>) => void;
}

export function SettingsTab({ data, onReplace, onUpdateForecastDate, onReplayIntro, onUpdateSettings }: SettingsTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = getSettings(data);

  const today = data.positionDate || todayStr();
  const horizonDays = Math.max(daysBetween(today, data.forecastDate), 30);
  const horizonMonths = Math.round(horizonDays / 30);

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
    toast({ title: "Data reset", description: "All data has been reset to demo values." });
  };

  const handleHorizonChange = (months: number[]) => {
    const days = months[0] * 30;
    onUpdateForecastDate(addDays(today, days));
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Forecast Horizon */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Forecast Horizon</CardTitle>
          <CardDescription>How far ahead to project your balance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Months ahead</Label>
            <span className="text-sm font-medium text-foreground">{horizonMonths} months</span>
          </div>
          <Slider
            value={[horizonMonths]}
            onValueChange={handleHorizonChange}
            min={1}
            max={24}
            step={1}
          />
          <p className="text-xs text-muted-foreground">
            Forecast through {data.forecastDate}
          </p>
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

      {/* Export / Import */}
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
                <RotateCcw className="h-4 w-4" /> Reset to Demo Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace all your current entries, subscriptions, and balance with demo data. This action cannot be undone.
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
