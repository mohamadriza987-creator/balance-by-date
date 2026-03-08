import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const Index = () => {
  const {
    data, setData, addSubscription, removeSubscription, toggleSubscriptionForecast,
    addEntry, removeEntry, toggleEntryForecast, updateSubscription, updateEntry,
    addInvestment, removeInvestment, updateInvestment,
    updateBalance, updateForecastDate,
  } = useFinanceData();

  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(String(data.currentBalance));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">BalanceByDate</h1>
              <p className="text-sm text-muted-foreground">Personal finance forecast planner</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="balance" className="text-sm text-muted-foreground whitespace-nowrap">Balance:</Label>
                {editingBalance ? (
                  <Input
                    id="balance" type="number" step="0.01" className="w-32 h-8"
                    value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)}
                    onBlur={() => { updateBalance(parseFloat(balanceInput) || 0); setEditingBalance(false); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { updateBalance(parseFloat(balanceInput) || 0); setEditingBalance(false); } }}
                    autoFocus
                  />
                ) : (
                  <button onClick={() => { setBalanceInput(String(data.currentBalance)); setEditingBalance(true); }} className="text-lg font-bold text-foreground hover:text-primary transition-colors">
                    {formatMoney(data.currentBalance)}
                  </button>
                )}
              </div>
              <ThemeToggle />
              <div className="flex items-center gap-2">
                <Label htmlFor="forecast-date" className="text-sm text-muted-foreground whitespace-nowrap">Forecast to:</Label>
                <Input id="forecast-date" type="date" className="w-40 h-8" value={data.forecastDate} onChange={(e) => updateForecastDate(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-6">
            <TabsTrigger value="timeline" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays className="h-4 w-4 hidden sm:block" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-1.5 text-xs sm:text-sm">
              <CreditCard className="h-4 w-4 hidden sm:block" /> Subs
            </TabsTrigger>
            <TabsTrigger value="entries" className="gap-1.5 text-xs sm:text-sm">
              <List className="h-4 w-4 hidden sm:block" /> Income/Exp
            </TabsTrigger>
            <TabsTrigger value="investments" className="gap-1.5 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 hidden sm:block" /> Investments
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-1.5 text-xs sm:text-sm">
              <PlusCircle className="h-4 w-4 hidden sm:block" /> Add New
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
              <Settings className="h-4 w-4 hidden sm:block" /> Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <TimelineTab data={data} />
          </TabsContent>
          <TabsContent value="subscriptions">
            <SubscriptionsTab subscriptions={data.subscriptions} onToggle={toggleSubscriptionForecast} onRemove={removeSubscription} onUpdate={updateSubscription} />
          </TabsContent>
          <TabsContent value="entries">
            <EntriesTab entries={data.entries} onToggle={toggleEntryForecast} onRemove={removeEntry} onUpdate={updateEntry} />
          </TabsContent>
          <TabsContent value="investments">
            <InvestmentsTab investments={data.investments || []} onRemove={removeInvestment} onUpdate={updateInvestment} />
          </TabsContent>
          <TabsContent value="add">
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
          </TabsContent>
          <TabsContent value="settings">
            <SettingsTab data={data} onReplace={(d) => setData(d)} onUpdateForecastDate={updateForecastDate} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
