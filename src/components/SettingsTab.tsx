import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Upload, RotateCcw, Heart } from "lucide-react";
import type { AppData } from "@/lib/finance-types";
import { seedData, addDays, todayStr, daysBetween } from "@/lib/finance-utils";
import { useToast } from "@/hooks/use-toast";

interface SettingsTabProps {
  data: AppData;
  onReplace: (data: AppData) => void;
  onUpdateForecastDate: (date: string) => void;
  onReplayIntro?: () => void;
}

export function SettingsTab({ data, onReplace, onUpdateForecastDate, onReplayIntro }: SettingsTabProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

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
