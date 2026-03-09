import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, TrendingUp, Target } from "lucide-react";
import type { AppData, OtherAsset, OtherAssetType } from "@/lib/finance-types";
import { formatMoney, formatDate, todayStr, addDays, daysBetween } from "@/lib/finance-utils";

interface OtherAssetsTabProps {
  data: AppData;
  onAddOtherAsset: (asset: Omit<OtherAsset, "id">) => void;
  onRemoveOtherAsset: (id: string) => void;
}

export function OtherAssetsTab({ data, onAddOtherAsset, onRemoveOtherAsset }: OtherAssetsTabProps) {
  const [showForm, setShowForm] = useState(false);
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);

  const totalValue = data.otherAssets.reduce((sum, a) => sum + a.currentValue, 0);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
        <CardContent className="py-4 px-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Other Assets</p>
              <p className="text-2xl font-bold text-foreground">{fm(totalValue)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Not included in available balance</p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-400" />
          </div>
        </CardContent>
      </Card>

      {!showForm && (
        <Button className="w-full" variant="outline" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Other Asset Manually
        </Button>
      )}

      {showForm && (
        <AddOtherAssetForm
          onAdd={(asset) => {
            onAddOtherAsset(asset);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
          fm={fm}
        />
      )}

      {data.otherAssets.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">OTHER ASSETS ({data.otherAssets.length})</p>
          {data.otherAssets.map(asset => (
            <OtherAssetCard key={asset.id} asset={asset} fm={fm} onRemove={onRemoveOtherAsset} />
          ))}
        </div>
      )}

      {data.otherAssets.length === 0 && !showForm && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">No other assets yet</p>
            <p className="text-xs text-muted-foreground mt-1">Assets like RD, FD, and goal savings will appear here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OtherAssetCard({ asset, fm, onRemove }: { asset: OtherAsset; fm: (n: number) => string; onRemove: (id: string) => void }) {
  const isGoalLinked = !!asset.linkedGoalId;
  const remaining = asset.targetAmount ? asset.targetAmount - asset.currentValue : 0;
  const progress = asset.targetAmount ? Math.min(100, Math.round((asset.currentValue / asset.targetAmount) * 100)) : 0;
  const monthsLeft = asset.maturityDate ? Math.max(0, Math.round(daysBetween(todayStr(), asset.maturityDate) / 30)) : null;

  return (
    <Card className="border-purple-500/20">
      <CardContent className="px-4 py-3 space-y-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <p className="text-sm font-medium">{asset.name}</p>
              <Badge variant="outline" className="text-[9px]">{asset.type}</Badge>
              <Badge className={`text-[9px] ${
                asset.status === "Active" ? "bg-success/20 text-success border-success/30" :
                asset.status === "Completed" ? "bg-primary/20 text-primary border-primary/30" :
                "bg-muted text-muted-foreground border-border"
              }`}>{asset.status}</Badge>
              {isGoalLinked && <Badge className="text-[9px] bg-purple-500/20 text-purple-400 border-purple-500/30">Goal-Linked</Badge>}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onRemove(asset.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">Current Value</p>
            <p className="font-bold text-base">{fm(asset.currentValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Monthly Contribution</p>
            <p className="font-bold text-success">{fm(asset.monthlyContribution)}</p>
          </div>
          {asset.expectedReturn > 0 && (
            <div>
              <p className="text-muted-foreground mb-0.5">Expected Return</p>
              <p className="font-bold">{asset.expectedReturn}% p.a.</p>
            </div>
          )}
          {asset.maturityDate && (
            <div>
              <p className="text-muted-foreground mb-0.5">Maturity Date</p>
              <p className="font-bold">{formatDate(asset.maturityDate)}</p>
            </div>
          )}
        </div>

        {asset.targetAmount && (
          <div className="rounded-lg border border-border/50 bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress to Target</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Target: {fm(asset.targetAmount)}</span>
              {remaining > 0 && <span className="text-warning font-medium">{fm(remaining)} to go</span>}
            </div>
            {monthsLeft !== null && monthsLeft > 0 && (
              <p className="text-[10px] text-muted-foreground">Approximately {monthsLeft} month{monthsLeft !== 1 ? "s" : ""} remaining</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddOtherAssetForm({ onAdd, onCancel, fm }: {
  onAdd: (asset: Omit<OtherAsset, "id">) => void;
  onCancel: () => void;
  fm: (n: number) => string;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<OtherAssetType>("Other");
  const [currentValue, setCurrentValue] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("0");
  const [targetAmount, setTargetAmount] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentValue) return;

    onAdd({
      name: name.trim(),
      type,
      currentValue: parseFloat(currentValue) || 0,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      expectedReturn: parseFloat(expectedReturn) || 0,
      targetAmount: targetAmount ? parseFloat(targetAmount) : undefined,
      maturityDate: maturityDate || undefined,
      startDate: todayStr(),
      status: "Active",
    });
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="px-4 py-3">
        <CardTitle className="text-base">Add Other Asset</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs">Asset Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Emergency Fund" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Type *</Label>
            <Select value={type} onValueChange={(v) => setType(v as OtherAssetType)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="RD">Recurring Deposit (RD)</SelectItem>
                <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
                <SelectItem value="Goal Savings">Goal Savings</SelectItem>
                <SelectItem value="Emergency Fund">Emergency Fund</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Current Value *</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={currentValue} onChange={e => setCurrentValue(e.target.value)} placeholder="0.00" className="h-9" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Monthly Contribution</Label>
              <Input type="number" inputMode="decimal" step="0.01" value={monthlyContribution} onChange={e => setMonthlyContribution(e.target.value)} placeholder="0.00" className="h-9" />
            </div>
            <div>
              <Label className="text-xs">Expected Return (%)</Label>
              <Input type="number" inputMode="decimal" step="0.1" value={expectedReturn} onChange={e => setExpectedReturn(e.target.value)} placeholder="0" className="h-9" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Target Amount (optional)</Label>
            <Input type="number" inputMode="decimal" step="0.01" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} placeholder="Optional" className="h-9" />
          </div>
          <div>
            <Label className="text-xs">Maturity Date (optional)</Label>
            <Input type="date" value={maturityDate} onChange={e => setMaturityDate(e.target.value)} className="h-9" />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1" disabled={!name.trim() || !currentValue}>Add Asset</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
