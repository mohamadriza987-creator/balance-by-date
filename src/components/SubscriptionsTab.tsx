import { useState } from "react";
import { Trash2, Pencil, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subscription, Frequency } from "@/lib/finance-types";
import { formatDate, formatMoney } from "@/lib/finance-utils";

interface SubscriptionsTabProps {
  subscriptions: Subscription[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Omit<Subscription, "id">>) => void;
}

export function SubscriptionsTab({ subscriptions, onToggle, onRemove, onUpdate }: SubscriptionsTabProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-muted-foreground text-sm">No subscriptions yet.</p>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) =>
                editingId === sub.id ? (
                  <EditableSubRow key={sub.id} sub={sub} onSave={(updates) => { onUpdate(sub.id, updates); setEditingId(null); }} onCancel={() => setEditingId(null)} />
                ) : (
                  <div key={sub.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Switch checked={sub.includeInForecast} onCheckedChange={() => onToggle(sub.id)} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{sub.name}</p>
                          {sub.isTrial && <Badge variant="outline" className="text-xs bg-warning/10 text-warning">Trial</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(sub.amount)} / {sub.frequency} · Next: {formatDate(sub.nextDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{sub.category}</Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingId(sub.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove(sub.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EditableSubRow({ sub, onSave, onCancel }: { sub: Subscription; onSave: (updates: Partial<Omit<Subscription, "id">>) => void; onCancel: () => void }) {
  const [name, setName] = useState(sub.name);
  const [amount, setAmount] = useState(String(sub.amount));
  const [frequency, setFrequency] = useState<Frequency>(sub.frequency);
  const [nextDate, setNextDate] = useState(sub.nextDate);
  const [category, setCategory] = useState(sub.category);

  return (
    <div className="rounded-lg border-2 border-primary/30 px-4 py-3 space-y-3 bg-muted/30">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className="h-8" />
        <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="h-8" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="h-8" />
        <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="h-8" />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}><X className="h-4 w-4 mr-1" /> Cancel</Button>
        <Button size="sm" onClick={() => onSave({ name, amount: parseFloat(amount) || 0, frequency, nextDate, category })}><Check className="h-4 w-4 mr-1" /> Save</Button>
      </div>
    </div>
  );
}
