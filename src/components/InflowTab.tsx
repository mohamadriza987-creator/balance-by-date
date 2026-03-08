import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { Trash2, Pencil, Check, X, Plus } from "lucide-react";
import type { Entry, Frequency } from "@/lib/finance-types";
import { todayStr, formatDate, formatMoney } from "@/lib/finance-utils";

interface InflowTabProps {
  entries: Entry[];
  onAddEntry: (entry: Omit<Entry, "id">) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Entry, "id">>) => void;
  incomeDescriptions?: string[];
  incomeCategories?: string[];
}

export function InflowTab({ entries, onAddEntry, onToggle, onRemove, onUpdate, incomeDescriptions = [], incomeCategories = [] }: InflowTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const incomeEntries = entries.filter((e) => e.amount >= 0);

  // Add form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("");

  const isValid = useMemo(() => {
    return !!(name.trim() && amount && date && category.trim());
  }, [name, amount, date, category]);

  const reset = () => {
    setName(""); setAmount(""); setFrequency("monthly"); setDate(todayStr()); setCategory("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onAddEntry({
      label: name, amount: Math.abs(parseFloat(amount)),
      date, frequency, category: category || "General", includeInForecast: true,
    });
    reset();
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      {/* Quick Add Card - like reference app */}
      <Card className="border-success/30">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base text-success">+ INFLOW</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancel" : <><Plus className="h-3.5 w-3.5 mr-1" /> New</>}
            </Button>
          </div>
        </CardHeader>
        {showForm && (
          <CardContent className="px-4 pb-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label className="text-xs">Description *</Label>
                <AutocompleteInput value={name} onChange={setName} suggestions={incomeDescriptions} placeholder="e.g. Salary" capitalize />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Amount ($) *</Label>
                  <Input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Frequency *</Label>
                  <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Date *</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Category *</Label>
                  <AutocompleteInput value={category} onChange={setCategory} suggestions={incomeCategories} placeholder="e.g. Salary" capitalize />
                </div>
              </div>
              <Button type="submit" className="w-full bg-success hover:bg-success/90 text-success-foreground" disabled={!isValid}>
                + Add Inflow
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      {/* Existing Entries */}
      {incomeEntries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No inflow entries yet. Tap "+ New" above to add one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {incomeEntries.map((entry) =>
            editingId === entry.id ? (
              <EditableRow key={entry.id} entry={entry} onSave={(updates) => { onUpdate(entry.id, updates); setEditingId(null); }} onCancel={() => setEditingId(null)} />
            ) : (
              <EntryRow key={entry.id} entry={entry} onToggle={onToggle} onRemove={onRemove} onEdit={() => setEditingId(entry.id)} />
            )
          )}
        </div>
      )}
    </div>
  );
}

function EntryRow({ entry, onToggle, onRemove, onEdit }: { entry: Entry; onToggle: (id: string) => void; onRemove: (id: string) => void; onEdit: () => void }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Switch checked={entry.includeInForecast} onCheckedChange={() => onToggle(entry.id)} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{entry.label}</p>
            <p className="text-[10px] text-muted-foreground">
              {formatMoney(Math.abs(entry.amount))} / {entry.frequency} · {formatDate(entry.date)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className="text-[10px]">{entry.category}</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(entry.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EditableRow({ entry, onSave, onCancel }: { entry: Entry; onSave: (updates: Partial<Omit<Entry, "id">>) => void; onCancel: () => void }) {
  const [label, setLabel] = useState(entry.label);
  const [amount, setAmount] = useState(String(entry.amount));
  const [frequency, setFrequency] = useState<Frequency>(entry.frequency);
  const [date, setDate] = useState(entry.date);
  const [category, setCategory] = useState(entry.category);

  return (
    <Card className="border-2 border-primary/30">
      <CardContent className="px-4 py-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label" className="h-8" />
          <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-8" />
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="h-8" />
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
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
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          <Button size="sm" onClick={() => onSave({ label, amount: parseFloat(amount) || 0, frequency, date, category })}><Check className="h-4 w-4 mr-1" /> Save</Button>
        </div>
      </CardContent>
    </Card>
  );
}
