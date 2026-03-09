import { useState, useCallback, useEffect, useRef } from "react";
import type { AppData, AccountBalances, Entry, Investment, Subscription, DebtPlan, UserProfile, Frequency, Transfer, AppSettings, Goal, OtherAsset, LiabilityPayoff } from "@/lib/finance-types";
import { seedData } from "@/lib/finance-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

function emptyData(): AppData {
  return seedData();
}

export function useFinanceData() {
  const { user } = useAuth();
  const [data, setDataState] = useState<AppData>(() => emptyData());
  const [loaded, setLoaded] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();

  // Load data from Supabase on mount / user change
  useEffect(() => {
    if (!user) {
      setLoaded(false);
      return;
    }

    const load = async () => {
      const { data: row } = await supabase
        .from("user_finance_data")
        .select("finance_data")
        .eq("user_id", user.id)
        .maybeSingle();

      if (row?.finance_data && typeof row.finance_data === "object" && Object.keys(row.finance_data).length > 0) {
        const fd = row.finance_data as unknown as AppData;
        // Ensure defaults
        if (!fd.investments) fd.investments = [];
        if (!fd.debtPlans) fd.debtPlans = [];
        if (!fd.accountBalances) fd.accountBalances = { cash: 0, bank: 0, creditCard: 0 };
        if (!fd.positionDate) fd.positionDate = new Date().toISOString().slice(0, 10);
        if (!fd.transfers) fd.transfers = [];
        if (!fd.goals) fd.goals = [];
        if (!fd.otherAssets) fd.otherAssets = [];
        if (!fd.liabilityPayoffs) fd.liabilityPayoffs = [];
        if (!fd.settings) fd.settings = { creditCardBillDay: 15, transferSuggestionsEnabled: true, transferLeadDays: 1, includeCreditCardInBalance: false, defaultGoalReturnRate: 7, showOtherAssetsInNav: true };
        setDataState(fd);
      } else {
        setDataState(emptyData());
      }
      setLoaded(true);
    };

    load();
  }, [user]);

  // Save to Supabase with debounce
  const persistToSupabase = useCallback((next: AppData) => {
    if (!user) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await supabase
        .from("user_finance_data")
        .update({ finance_data: next as any })
        .eq("user_id", user.id);
    }, 800);
  }, [user]);

  const setData = useCallback((updater: AppData | ((prev: AppData) => AppData)) => {
    setDataState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      persistToSupabase(next);
      return next;
    });
  }, [persistToSupabase]);

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
      const entry = prev.entries.find(e => e.id === id);
      let newEntries = prev.entries.filter((e) => e.id !== id);
      let newPlans = prev.debtPlans || [];
      
      const linkedPlan = newPlans.find(p => p.parentEntryId === id);
      if (linkedPlan) {
        newEntries = newEntries.filter(e => !linkedPlan.linkedEntryIds.includes(e.id));
        newPlans = newPlans.filter(p => p.parentEntryId !== id);
      }
      
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

  const addTransfer = useCallback((transfer: Omit<Transfer, "id">) => {
    setData((prev) => ({
      ...prev,
      transfers: [...(prev.transfers || []), { ...transfer, id: Math.random().toString(36).slice(2, 10) }],
    }));
  }, [setData]);

  const removeTransfer = useCallback((id: string) => {
    setData((prev) => ({ ...prev, transfers: (prev.transfers || []).filter((t) => t.id !== id) }));
  }, [setData]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...updates } }));
  }, [setData]);

  const addGoal = useCallback((goal: Omit<Goal, "id">) => {
    setData((prev) => ({
      ...prev,
      goals: [...(prev.goals || []), { ...goal, id: Math.random().toString(36).slice(2, 10) }],
    }));
  }, [setData]);

  const removeGoal = useCallback((id: string) => {
    setData((prev) => ({ ...prev, goals: (prev.goals || []).filter((g) => g.id !== id) }));
  }, [setData]);

  const addOtherAsset = useCallback((asset: Omit<OtherAsset, "id">) => {
    setData((prev) => ({
      ...prev,
      otherAssets: [...(prev.otherAssets || []), { ...asset, id: Math.random().toString(36).slice(2, 10) }],
    }));
  }, [setData]);

  const removeOtherAsset = useCallback((id: string) => {
    setData((prev) => ({ ...prev, otherAssets: (prev.otherAssets || []).filter((a) => a.id !== id) }));
  }, [setData]);

  const addLiabilityPayoff = useCallback((payoff: Omit<LiabilityPayoff, "id">) => {
    setData((prev) => ({
      ...prev,
      liabilityPayoffs: [...(prev.liabilityPayoffs || []), { ...payoff, id: Math.random().toString(36).slice(2, 10) }],
    }));
  }, [setData]);

  const removeLiabilityPayoff = useCallback((id: string) => {
    setData((prev) => ({ ...prev, liabilityPayoffs: (prev.liabilityPayoffs || []).filter((p) => p.id !== id) }));
  }, [setData]);

  return {
    data,
    loaded,
    setData,
    addSubscription, removeSubscription, toggleSubscriptionForecast,
    addEntry, removeEntry, toggleEntryForecast,
    updateSubscription, updateEntry,
    addInvestment, removeInvestment, updateInvestment,
    updateBalance, updateAccountBalances, updateForecastDate, updatePositionDate,
    updateUserProfile, addDebtWithPlan,
    addTransfer, removeTransfer, updateSettings,
    addGoal, removeGoal, addOtherAsset, removeOtherAsset,
    addLiabilityPayoff, removeLiabilityPayoff,
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
