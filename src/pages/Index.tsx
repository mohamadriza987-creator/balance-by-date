import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { IntroFlow } from "@/components/IntroFlow";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, Settings, CalendarIcon, TrendingUp } from "lucide-react";
import { useFinanceData } from "@/hooks/use-finance-data";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccountsTab } from "@/components/AccountsTab";
import { TransactionsTab } from "@/components/TransactionsTab";
import { InflowTab } from "@/components/InflowTab";
import { OutflowTab } from "@/components/OutflowTab";
import { ForecastTab } from "@/components/ForecastTab";
import { SettingsTab } from "@/components/SettingsTab";
import { formatDate, formatMoney, todayStr } from "@/lib/finance-utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "overview", label: "Overview", icon: LayoutDashboard },
  { value: "inflow", label: "Inflow", icon: ArrowDownLeft },
  { value: "outflow", label: "Outflow", icon: ArrowUpRight },
  { value: "forecast", label: "Forecast", icon: TrendingUp },
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
              <h1 className="text-lg font-bold tracking-tight text-foreground">{APP_NAME}</h1>
              <p className="text-[10px] text-muted-foreground">{APP_TAGLINE}</p>
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
            <span className="text-xs text-muted-foreground whitespace-nowrap">Balance as of</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-7 text-xs flex-1 justify-start text-left font-normal",
                    !data.positionDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3 w-3" />
                  {data.positionDate ? format(parseISO(data.positionDate), "MMM d, yyyy") : "Today"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={data.positionDate ? parseISO(data.positionDate) : new Date()}
                  onSelect={(date) => {
                    if (date) updatePositionDate(format(date, "yyyy-MM-dd"));
                  }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
                {data.positionDate !== todayStr() && (
                  <div className="px-3 pb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => updatePositionDate(todayStr())}
                    >
                      Reset to Today
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
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
          />
        )}
        {activeTab === "forecast" && (
          <ForecastTab data={data} />
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-bottom">
        <div className="grid grid-cols-4 h-16">
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
