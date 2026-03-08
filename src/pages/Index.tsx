import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Settings, CalendarIcon } from "lucide-react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountsTab } from "@/components/AccountsTab";
import { TransactionsTab } from "@/components/TransactionsTab";
import { InflowTab } from "@/components/InflowTab";
import { OutflowTab } from "@/components/OutflowTab";
import { SettingsTab } from "@/components/SettingsTab";
import { formatDate, formatMoney, todayStr } from "@/lib/finance-utils";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "inflow", label: "Inflow", icon: ArrowDownLeft },
  { value: "outflow", label: "Outflow", icon: ArrowUpRight },
] as const;

const Index = () => {
  const {
    data, setData,
    addSubscription, removeSubscription, toggleSubscriptionForecast,
    addEntry, removeEntry, toggleEntryForecast,
    updateSubscription, updateEntry,
    addInvestment, removeInvestment, updateInvestment,
    updateBalance, updateAccountBalances, updateForecastDate, updatePositionDate,
  } = useFinanceData();

  const [activeTab, setActiveTab] = useState("overview");
  const [showSettings, setShowSettings] = useState(false);

  if (showSettings) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="px-4 py-3 flex items-center justify-between">
            <button onClick={() => setShowSettings(false)} className="text-sm text-primary font-medium">← Back</button>
            <h1 className="text-lg font-bold text-foreground">Settings</h1>
            <ThemeToggle />
          </div>
        </header>
        <main className="px-3 py-4">
          <SettingsTab data={data} onReplace={(d) => setData(d)} onUpdateForecastDate={updateForecastDate} />
        </main>
      </div>
    );
  }

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
              <button
                onClick={() => setShowSettings(true)}
                className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-5 w-5" />
              </button>
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
        {activeTab === "overview" && (
          <div className="space-y-4">
            <AccountsTab data={data} onUpdateAccountBalances={updateAccountBalances} />
            <TransactionsTab data={data} />
          </div>
        )}
        {activeTab === "inflow" && (
          <InflowTab
            entries={data.entries}
            onAddEntry={addEntry}
            onToggle={toggleEntryForecast}
            onRemove={removeEntry}
            onUpdate={updateEntry}
            incomeDescriptions={[...new Set(data.entries.filter(e => e.amount > 0).map(e => e.label))]}
            incomeCategories={[...new Set(data.entries.filter(e => e.amount > 0).map(e => e.category))]}
          />
        )}
        {activeTab === "outflow" && (
          <OutflowTab
            entries={data.entries}
            subscriptions={data.subscriptions}
            investments={data.investments || []}
            onAddEntry={addEntry}
            onAddSubscription={addSubscription}
            onAddInvestment={addInvestment}
            onRemoveEntry={removeEntry}
            onRemoveSubscription={removeSubscription}
            onRemoveInvestment={removeInvestment}
            onToggleEntry={toggleEntryForecast}
            onToggleSubscription={toggleSubscriptionForecast}
            onUpdateEntry={updateEntry}
            onUpdateSubscription={updateSubscription}
            onUpdateInvestment={updateInvestment}
            expenseDescriptions={[...new Set(data.entries.filter(e => e.amount < 0).map(e => e.label))]}
            subscriptionDescriptions={[...new Set(data.subscriptions.map(s => s.name))]}
            investmentDescriptions={[...new Set((data.investments || []).map(i => i.name))]}
            expenseCategories={[...new Set(data.entries.filter(e => e.amount < 0).map(e => e.category))]}
            subscriptionCategories={[...new Set(data.subscriptions.map(s => s.category))]}
            investmentCategories={[...new Set((data.investments || []).map(i => i.category))]}
          />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-bottom">
        <div className="grid grid-cols-3 h-16">
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
