import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays, CreditCard, List, PlusCircle, Settings, TrendingUp } from "lucide-react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TimelineTab } from "@/components/TimelineTab";
import { SubscriptionsTab } from "@/components/SubscriptionsTab";
import { EntriesTab } from "@/components/EntriesTab";
import { AddNewTab } from "@/components/AddNewTab";
import { InvestmentsTab } from "@/components/InvestmentsTab";
import { SettingsTab } from "@/components/SettingsTab";
import { formatMoney } from "@/lib/finance-utils";

const tabs = [
  { value: "timeline", label: "Overview", icon: CalendarDays },
  { value: "subscriptions", label: "Subs", icon: CreditCard },
  { value: "entries", label: "Income", icon: List },
  { value: "investments", label: "Invest", icon: TrendingUp },
  { value: "add", label: "Add", icon: PlusCircle },
  { value: "settings", label: "Settings", icon: Settings },
] as const;

const Index = () => {
  const {
    data, setData, addSubscription, removeSubscription, toggleSubscriptionForecast,
    addEntry, removeEntry, toggleEntryForecast, updateSubscription, updateEntry,
    addInvestment, removeInvestment, updateInvestment,
    updateBalance, updateForecastDate,
  } = useFinanceData();

  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(data.currentBalance));
  const [activeTab, setActiveTab] = useState("timeline");

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Compact Mobile Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">BalanceByDate</h1>
              <p className="text-xs text-muted-foreground">Finance forecast planner</p>
            </div>
            <div className="flex items-center gap-2">
              {editingBalance ? (
                <Input
                  id="balance" type="number" step="0.01" className="w-28 h-8 text-sm"
                  value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)}
                  onBlur={() => { updateBalance(parseFloat(balanceInput) || 0); setEditingBalance(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { updateBalance(parseFloat(balanceInput) || 0); setEditingBalance(false); } }}
                  autoFocus
                />
              ) : (
                <button onClick={() => { setBalanceInput(String(data.currentBalance)); setEditingBalance(true); }} className="text-base font-bold text-foreground hover:text-primary transition-colors">
                  {formatMoney(data.currentBalance)}
                </button>
              )}
              <ThemeToggle />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Label htmlFor="forecast-date" className="text-xs text-muted-foreground whitespace-nowrap">Forecast to:</Label>
            <Input id="forecast-date" type="date" className="h-7 text-xs flex-1" value={data.forecastDate} onChange={(e) => updateForecastDate(e.target.value)} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 py-4">
        {activeTab === "timeline" && <TimelineTab data={data} />}
        {activeTab === "subscriptions" && (
          <SubscriptionsTab subscriptions={data.subscriptions} onToggle={toggleSubscriptionForecast} onRemove={removeSubscription} onUpdate={updateSubscription} />
        )}
        {activeTab === "entries" && (
          <EntriesTab entries={data.entries} onToggle={toggleEntryForecast} onRemove={removeEntry} onUpdate={updateEntry} />
        )}
        {activeTab === "investments" && (
          <InvestmentsTab investments={data.investments || []} onRemove={removeInvestment} onUpdate={updateInvestment} />
        )}
        {activeTab === "add" && (
          <AddNewTab
            onAddSubscription={addSubscription}
            onAddEntry={addEntry}
            onAddInvestment={addInvestment}
            incomeDescriptions={[...new Set(data.entries.filter(e => e.amount > 0).map(e => e.label))]}
            expenseDescriptions={[...new Set(data.entries.filter(e => e.amount < 0).map(e => e.label))]}
            subscriptionDescriptions={[...new Set(data.subscriptions.map(s => s.name))]}
            investmentDescriptions={[...new Set((data.investments || []).map(i => i.name))]}
            incomeCategories={[...new Set(data.entries.filter(e => e.amount > 0).map(e => e.category))]}
            expenseCategories={[...new Set(data.entries.filter(e => e.amount < 0).map(e => e.category))]}
            subscriptionCategories={[...new Set(data.subscriptions.map(s => s.category))]}
            investmentCategories={[...new Set((data.investments || []).map(i => i.category))]}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab data={data} onReplace={(d) => setData(d)} onUpdateForecastDate={updateForecastDate} />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-bottom">
        <div className="grid grid-cols-6 h-16">
          {tabs.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                activeTab === value
                  ? "text-primary font-semibold"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className={`h-5 w-5 ${activeTab === value ? "text-primary" : ""}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default Index;
