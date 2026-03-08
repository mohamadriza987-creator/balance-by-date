import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Entry, Frequency } from "@/lib/finance-types";
import { formatDate, formatMoney } from "@/lib/finance-utils";

interface EntriesTabProps {
  entries: Entry[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Entry, "id">>) => void;
}

export function EntriesTab({ entries, onToggle, onRemove, onUpdate }: EntriesTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const incomeEntries = entries.filter((e) => e.amount >= 0);
  const expenseEntries = entries.filter((e) => e.amount < 0);

  const renderEntry = (entry: Entry) =>
    editingId === entry.id ? (
      <EditableEntryRow key={entry.id} entry={entry} onSave={(updates) => { onUpdate(entry.id, updates); setEditingId(null); }} onCancel={() => setEditingId(null)} />
    ) : (
      <EntryRow key={entry.id} entry={entry} onToggle={onToggle} onRemove={onRemove} onEdit={() => setEditingId(entry.id)} />
    );

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
            <div className="space-y-3">{incomeEntries.map(renderEntry)}</div>
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
            <div className="space-y-3">{expenseEntries.map(renderEntry)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EntryRow({ entry, onToggle, onRemove, onEdit }: { entry: Entry; onToggle: (id: string) => void; onRemove: (id: string) => void; onEdit: () => void }) {
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove(entry.id)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function EditableEntryRow({ entry, onSave, onCancel }: { entry: Entry; onSave: (updates: Partial<Omit<Entry, "id">>) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(entry.amount));
  const [frequency, setFrequency] = useState<Frequency>(entry.frequency);
  const [date, setDate] = useState(entry.date);
  const [category, setCategory] = useState(entry.category);

  return (
    <div className="rounded-lg border-2 border-primary/30 px-4 py-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-8" />
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-8" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="h-8" />
        <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="once">Once</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
        <Button size="sm" onClick={() => onSave({ label, amount: parseFloat(amount) || 0, frequency, date, category })}><Check className="h-4 w-4 mr-1" /> Save</Button>
      </div>
    </div>
  );
}
