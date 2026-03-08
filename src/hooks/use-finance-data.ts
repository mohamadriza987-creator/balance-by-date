import { useState, useCallback } from "react";
import type { AppData, AccountBalances, Entry, Investment, Subscription, DebtPlan, UserProfile } from "@/lib/finance-types";
import { loadData, saveData } from "@/lib/finance-utils";

export function useFinanceData() {
  const [data, setDataState] = useState<AppData>(() => {
    const d = loadData();
    if (!d.investments) d.investments = [];
    if (!d.debtPlans) d.debtPlans = [];
    if (!d.accountBalances) d.accountBalances = { cash: 0, bank: d.currentBalance || 0, creditCard: 0 };
    if (!d.positionDate) d.positionDate = new Date().toISOString().slice(0, 10);
    return d;
  });

  const setData = useCallback((updater: AppData | ((prev: AppData) => AppData)) => {
    setDataState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveData(next);
      return next;
    });
  }, []);

  const addSubscription = useCallback((sub: Omit<Subscription, "id">) => {
    setData((prev) => ({
      ...prev,
      subscriptions: [...prev.subscriptions, { ...sub, id: Math.random().toString(36).slice(2, 10) }],
    }));
  }, [setData]);

  const removeSubscription = useCallback((id: string) => {
    setData((prev) => ({ ...prev, subscriptions: prev.subscriptions.filter((s) => s.id !== id) }));
  }, [setData]);

  const toggleSubscriptionForecast = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) => s.id === id ? { ...s, includeInForecast: !s.includeInForecast } : s),
    }));
  }, [setData]);

  const addEntry = useCallback((entry: Omit<Entry, "id">) => {
    const id = Math.random().toString(36).slice(2, 10);
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, { ...entry, id }],
    }));
    return id;
  }, [setData]);

  const removeEntry = useCallback((id: string) => {
    setData((prev) => {
      // Also remove linked debt plan entries
      const entry = prev.entries.find(e => e.id === id);
      let newEntries = prev.entries.filter((e) => e.id !== id);
      let newPlans = prev.debtPlans || [];
      
      // If removing a parent debt entry, also remove linked entries
      const linkedPlan = newPlans.find(p => p.parentEntryId === id);
      if (linkedPlan) {
        newEntries = newEntries.filter(e => !linkedPlan.linkedEntryIds.includes(e.id));
        newPlans = newPlans.filter(p => p.parentEntryId !== id);
      }
      
      // If removing a linked entry, update the plan
      if (entry?.debtLinkId) {
        newPlans = newPlans.map(p => ({
          ...p,
          linkedEntryIds: p.linkedEntryIds.filter(eid => eid !== id),
        }));
      }
      
      return { ...prev, entries: newEntries, debtPlans: newPlans };
    });
  }, [setData]);

  const toggleEntryForecast = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => e.id === id ? { ...e, includeInForecast: !e.includeInForecast } : e),
    }));
  }, [setData]);

  const updateSubscription = useCallback((id: string, updates: Partial<Omit<Subscription, "id">>) => {
    setData((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) => s.id === id ? { ...s, ...updates } : s),
    }));
  }, [setData]);

  const updateEntry = useCallback((id: string, updates: Partial<Omit<Entry, "id">>) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((e) => e.id === id ? { ...e, ...updates } : e),
    }));
  }, [setData]);

  const addInvestment = useCallback((inv: Omit<Investment, "id">) => {
    setData((prev) => ({
      ...prev,
      investments: [...(prev.investments || []), { ...inv, id: Math.random().toString(36).slice(2, 10) }],
    }));
  }, [setData]);

  const removeInvestment = useCallback((id: string) => {
    setData((prev) => ({ ...prev, investments: (prev.investments || []).filter((i) => i.id !== id) }));
  }, [setData]);

  const updateInvestment = useCallback((id: string, updates: Partial<Omit<Investment, "id">>) => {
    setData((prev) => ({
      ...prev,
      investments: (prev.investments || []).map((i) => i.id === id ? { ...i, ...updates } : i),
    }));
  }, [setData]);

  const updateBalance = useCallback((balance: number) => {
    setData((prev) => ({ ...prev, currentBalance: balance }));
  }, [setData]);

  const updateAccountBalances = useCallback((balances: AccountBalances) => {
    const total = balances.cash + balances.bank + balances.creditCard;
    setData((prev) => ({ ...prev, accountBalances: balances, currentBalance: total }));
  }, [setData]);

  const updateForecastDate = useCallback((date: string) => {
    setData((prev) => ({ ...prev, forecastDate: date }));
  }, [setData]);

  const updatePositionDate = useCallback((date: string) => {
    setData((prev) => ({ ...prev, positionDate: date }));
  }, [setData]);

  const updateUserProfile = useCallback((profile: UserProfile) => {
    setData((prev) => ({ ...prev, userProfile: profile }));
  }, [setData]);

  const addDebtWithPlan = useCallback((
    parentEntry: Omit<Entry, "id">,
    plan: { splits: number; frequency: Frequency; startDate: string; direction: "received" | "given" }
  ) => {
    setData((prev) => {
      const parentId = Math.random().toString(36).slice(2, 10);
      const totalAmount = Math.abs(parentEntry.amount);
      const splitAmount = totalAmount / plan.splits;
      const linkedIds: string[] = [];
      const newEntries = [...prev.entries, { ...parentEntry, id: parentId }];

      let currentDate = plan.startDate;
      for (let i = 0; i < plan.splits; i++) {
        const linkedId = Math.random().toString(36).slice(2, 10);
        linkedIds.push(linkedId);

        if (plan.direction === "received") {
          // Debt received (inflow) → generate repayment outflows
          newEntries.push({
            id: linkedId,
            label: `Repayment - ${parentEntry.label}`,
            amount: -splitAmount,
            date: currentDate,
            frequency: "once" as const,
            category: "Debt",
            account: parentEntry.account,
            includeInForecast: true,
            isOptional: true,
            debtLinkId: parentId,
            debtType: "repayment" as const,
          });
        } else {
          // Debt given (outflow) → generate recovery inflows
          newEntries.push({
            id: linkedId,
            label: `Recovery - ${parentEntry.label}`,
            amount: splitAmount,
            date: currentDate,
            frequency: "once" as const,
            category: "Debt",
            account: parentEntry.account,
            includeInForecast: true,
            isOptional: false,
            debtLinkId: parentId,
            debtType: "recovery" as const,
          });
        }

        if (i < plan.splits - 1) {
          currentDate = getNextDate(currentDate, plan.frequency);
        }
      }

      const newPlan: DebtPlan = {
        id: Math.random().toString(36).slice(2, 10),
        parentEntryId: parentId,
        direction: plan.direction,
        totalAmount,
        splits: plan.splits,
        frequency: plan.frequency,
        startDate: plan.startDate,
        linkedEntryIds: linkedIds,
      };

      return {
        ...prev,
        entries: newEntries,
        debtPlans: [...(prev.debtPlans || []), newPlan],
      };
    });
  }, [setData]);

  return {
    data,
    setData,
    addSubscription, removeSubscription, toggleSubscriptionForecast,
    addEntry, removeEntry, toggleEntryForecast,
    updateSubscription, updateEntry,
    addInvestment, removeInvestment, updateInvestment,
    updateBalance, updateAccountBalances, updateForecastDate, updatePositionDate,
    updateUserProfile, addDebtWithPlan,
  };
}

function getNextDate(dateStr: string, freq: Frequency): string {
  const d = new Date(dateStr);
  switch (freq) {
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "biweekly": d.setDate(d.getDate() + 14); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    default: d.setMonth(d.getMonth() + 1); break;
  }
  return d.toISOString().slice(0, 10);
}
