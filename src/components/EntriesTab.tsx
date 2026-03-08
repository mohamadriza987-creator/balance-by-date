import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Entry } from "@/lib/finance-types";
import { formatDate, formatMoney } from "@/lib/finance-utils";

interface EntriesTabProps {
  entries: Entry[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function EntriesTab({ entries, onToggle, onRemove }: EntriesTabProps) {
  const incomeEntries = entries.filter((e) => e.amount >= 0);
  const expenseEntries = entries.filter((e) => e.amount < 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-success">Income</CardTitle>
        </CardHeader>
        <CardContent>
          {incomeEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No income entries.</p>
          ) : (
            <div className="space-y-3">
              {incomeEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onToggle={onToggle} onRemove={onRemove} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-destructive">Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {expenseEntries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No expense entries.</p>
          ) : (
            <div className="space-y-3">
              {expenseEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onToggle={onToggle} onRemove={onRemove} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntryRow({ entry, onToggle, onRemove }: { entry: Entry; onToggle: (id: string) => void; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 gap-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Switch checked={entry.includeInForecast} onCheckedChange={() => onToggle(entry.id)} />
        <div className="min-w-0">
          <p className="font-medium truncate">{entry.label}</p>
          <p className="text-xs text-muted-foreground">
            {formatMoney(Math.abs(entry.amount))} / {entry.frequency} · {formatDate(entry.date)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs">{entry.category}</Badge>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove(entry.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
