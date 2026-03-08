import { useState, useCallback } from "react";
import type { AppData, Entry, Subscription } from "@/lib/finance-types";
import { loadData, saveData } from "@/lib/finance-utils";

export function useFinanceData() {
  const [data, setDataState] = useState<AppData>(loadData);

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
    setData((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.filter((s) => s.id !== id),
    }));
  }, [setData]);

  const toggleSubscriptionForecast = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) =>
        s.id === id ? { ...s, includeInForecast: !s.includeInForecast } : s
      ),
    }));
  }, [setData]);

  const addEntry = useCallback((entry: Omit<Entry, "id">) => {
    setData((prev) => ({
      ...prev,
      entries: [...prev.entries, { ...entry, id: Math.random().toString(36).slice(2, 10) }],
    }));
  }, [setData]);

  const removeEntry = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
    }));
  }, [setData]);

  const toggleEntryForecast = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === id ? { ...e, includeInForecast: !e.includeInForecast } : e
      ),
    }));
  }, [setData]);

  const updateSubscription = useCallback((id: string, updates: Partial<Omit<Subscription, "id">>) => {
    setData((prev) => ({
      ...prev,
      subscriptions: prev.subscriptions.map((s) =>
        s.id === id ? { ...s, ...updates } : s
      ),
    }));
  }, [setData]);

  const updateEntry = useCallback((id: string, updates: Partial<Omit<Entry, "id">>) => {
    setData((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }));
  }, [setData]);

  const updateBalance = useCallback((balance: number) => {
    setData((prev) => ({ ...prev, currentBalance: balance }));
  }, [setData]);

  const updateForecastDate = useCallback((date: string) => {
    setData((prev) => ({ ...prev, forecastDate: date }));
  }, [setData]);

  return {
    data,
    setData,
    addSubscription,
    removeSubscription,
    toggleSubscriptionForecast,
    addEntry,
    removeEntry,
    toggleEntryForecast,
    updateSubscription,
    updateEntry,
    updateBalance,
    updateForecastDate,
  };
}
