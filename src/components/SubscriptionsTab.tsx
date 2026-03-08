import { Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import type { Subscription } from "@/lib/finance-types";
import { formatDate, formatMoney } from "@/lib/finance-utils";

interface SubscriptionsTabProps {
  subscriptions: Subscription[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function SubscriptionsTab({ subscriptions, onToggle, onRemove }: SubscriptionsTabProps) {
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
              {subscriptions.map((sub) => (
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove(sub.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
