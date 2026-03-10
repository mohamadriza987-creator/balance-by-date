import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingDown, TrendingUp, Heart, Target, AlertTriangle,
  Sparkles, Flame, ShieldCheck, Lightbulb, Clock, CreditCard,
  FileText, Scale, Leaf, Zap,
} from "lucide-react";
import type { AppData, ForecastItem } from "@/lib/finance-types";
import {
  computeForecast, computeBalanceAtPosition,
  formatMoney, formatDate, toMonthlyAmount,
  daysBetween, getRiskDate, todayStr, getNextOccurrence,
  getMonthSubscriptionTotal,
} from "@/lib/finance-utils";
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from "date-fns";

interface OverviewInsightsProps {
  data: AppData;
}

interface Insight {
  icon: React.ReactNode;
  text: string;
  tone: "positive" | "neutral" | "warning" | "danger" | "opportunity";
}

const toneStyles = {
  positive: "border-l-4 border-l-success bg-success/5",
  neutral: "border-l-4 border-l-primary bg-primary/5",
  warning: "border-l-4 border-l-warning bg-warning/5",
  danger: "border-l-4 border-l-destructive bg-destructive/5",
  opportunity: "border-l-4 border-l-golden bg-golden/5",
};

const toneIcons = {
  positive: "text-success",
  neutral: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  opportunity: "text-golden",
};

export function OverviewInsights({ data }: OverviewInsightsProps) {
  const profile = data.userProfile;
  const fm = (n: number) => formatMoney(n, profile);
  const today = data.positionDate || todayStr();

  const effectiveBalance = useMemo(() => computeBalanceAtPosition(data), [data]);
  const effectiveData = useMemo((): AppData => ({
    ...data, currentBalance: effectiveBalance,
  }), [data, effectiveBalance]);

  const forecast = useMemo(() => computeForecast(effectiveData), [effectiveData]);
  const riskDate = getRiskDate(forecast);

  // Compute monthly category totals for current + previous month
  const monthlyAnalysis = useMemo(() => {
    const refDate = parseISO(today);
    const getMonthExpenses = (monthsAgo: number) => {
      const d = subMonths(refDate, monthsAgo);
      const ms = format(startOfMonth(d), "yyyy-MM-dd");
      const me = format(endOfMonth(d), "yyyy-MM-dd");
      const categories: Record<string, number> = {};
      let totalIncome = 0, totalExpense = 0;

      for (const entry of data.entries) {
        if (!entry.includeInForecast) continue;
        if (entry.category === "Debt Payoff") continue;
        let dd = entry.date;
        while (dd <= me) {
          if (dd >= ms) {
            if (entry.amount >= 0) totalIncome += entry.amount;
            else {
              totalExpense += Math.abs(entry.amount);
              categories[entry.category] = (categories[entry.category] || 0) + Math.abs(entry.amount);
            }
          }
          if (entry.frequency === "once") break;
          dd = getNextOccurrence(dd, entry.frequency);
        }
      }
      for (const sub of data.subscriptions) {
        if (!sub.includeInForecast) continue;
        const chargeStart = (sub.isTrial && sub.trialEndDate) ? sub.trialEndDate : sub.nextDate;
        let dd = chargeStart;
        while (dd <= me) {
          if (dd >= ms) {
            totalExpense += sub.amount;
            categories[sub.category] = (categories[sub.category] || 0) + sub.amount;
          }
          if (sub.frequency === "once") break;
          dd = getNextOccurrence(dd, sub.frequency);
        }
      }
      return { categories, totalIncome, totalExpense };
    };

    return {
      current: getMonthExpenses(0),
      previous: getMonthExpenses(1),
    };
  }, [data, today]);

  // === SPENDING PULSE ===
  const spendingInsights = useMemo(() => {
    const items: Insight[] = [];
    const { current, previous } = monthlyAnalysis;

    if (previous.totalExpense > 0 && current.totalExpense > 0) {
      const change = ((current.totalExpense - previous.totalExpense) / previous.totalExpense) * 100;
      if (change > 10) {
        items.push({
          icon: <TrendingUp className="h-4 w-4" />,
          text: `Spending is up ${Math.round(change)}% compared to last month. Might be worth a quick look at what's growing.`,
          tone: "warning",
        });
      } else if (change < -10) {
        items.push({
          icon: <TrendingDown className="h-4 w-4" />,
          text: `Nice! You spent ${Math.round(Math.abs(change))}% less than last month. Keep that momentum going 💪`,
          tone: "positive",
        });
      } else {
        items.push({
          icon: <ShieldCheck className="h-4 w-4" />,
          text: `Spending is steady compared to last month — you're on track.`,
          tone: "positive",
        });
      }
    }

    // Category-specific trends
    const risingCategories: string[] = [];
    const fallingCategories: string[] = [];
    for (const [cat, amount] of Object.entries(current.categories)) {
      const prevAmount = previous.categories[cat] || 0;
      if (prevAmount > 0) {
        const change = ((amount - prevAmount) / prevAmount) * 100;
        if (change > 25) risingCategories.push(cat);
        else if (change < -25) fallingCategories.push(cat);
      }
    }

    if (risingCategories.length > 0) {
      items.push({
        icon: <Flame className="h-4 w-4" />,
        text: `${risingCategories.join(", ")} ${risingCategories.length === 1 ? "is" : "are"} climbing faster than last month. Want to keep an eye on that?`,
        tone: "warning",
      });
    }
    if (fallingCategories.length > 0) {
      items.push({
        icon: <Leaf className="h-4 w-4" />,
        text: `You cut down on ${fallingCategories.join(", ")} this month — nice move.`,
        tone: "positive",
      });
    }

    return items;
  }, [monthlyAnalysis]);

  // === CASH FLOW PULSE ===
  const cashFlowInsights = useMemo(() => {
    const items: Insight[] = [];
    const { current, previous } = monthlyAnalysis;

    const currentNet = current.totalIncome - current.totalExpense;
    const previousNet = previous.totalIncome - previous.totalExpense;

    if (currentNet > 0 && previousNet > 0 && currentNet > previousNet) {
      items.push({
        icon: <Heart className="h-4 w-4" />,
        text: `You're breathing easier this month — net cash flow improved by ${fm(currentNet - previousNet)}.`,
        tone: "positive",
      });
    } else if (currentNet > 0 && previousNet > 0 && currentNet < previousNet) {
      items.push({
        icon: <Heart className="h-4 w-4" />,
        text: `Cash flow is tighter this month. You're still positive, but margins shrank a bit.`,
        tone: "neutral",
      });
    } else if (currentNet < 0) {
      items.push({
        icon: <AlertTriangle className="h-4 w-4" />,
        text: `You're spending more than you're earning this month. Let's find ways to balance things out.`,
        tone: "danger",
      });
    } else if (currentNet > 0 && previous.totalExpense === 0) {
      items.push({
        icon: <Heart className="h-4 w-4" />,
        text: `You're in positive cash flow this month — great start!`,
        tone: "positive",
      });
    }

    // Upcoming large inflow
    const nextInflow = data.entries
      .filter(e => e.amount > 0 && e.includeInForecast && e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    if (nextInflow) {
      const days = daysBetween(today, nextInflow.date);
      if (days <= 7) {
        items.push({
          icon: <Zap className="h-4 w-4" />,
          text: `${nextInflow.label} is coming in ${days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`} — ${fm(nextInflow.amount)} heading your way.`,
          tone: "positive",
        });
      }
    }

    return items;
  }, [monthlyAnalysis, data.entries, today, fm]);

  // === OPPORTUNITY INSIGHTS ===
  const opportunityInsights = useMemo(() => {
    const items: Insight[] = [];
    const { current } = monthlyAnalysis;
    const currentNet = current.totalIncome - current.totalExpense;

    // Good time to invest?
    if (currentNet > 0 && effectiveBalance > current.totalExpense * 3) {
      items.push({
        icon: <Sparkles className="h-4 w-4" />,
        text: `You have a healthy buffer. This could be a good time to start investing or grow a goal.`,
        tone: "opportunity",
      });
    }

    // Debt just ended?
    const recentlyEndedDebts = data.entries.filter(e =>
      e.debtLinkId && !e.includeInForecast && e.frequency !== "once"
    );
    if (recentlyEndedDebts.length > 0) {
      items.push({
        icon: <Target className="h-4 w-4" />,
        text: `A loan or debt payment recently ended — next month may feel lighter. Want to start a goal with that freed-up cash?`,
        tone: "opportunity",
      });
    }

    // Subscription savings opportunity
    const optionalCats = ["Entertainment", "Shopping"];
    const optionalTotal = data.subscriptions
      .filter(s => s.includeInForecast && optionalCats.includes(s.category))
      .reduce((sum, s) => sum + toMonthlyAmount(s.amount, s.frequency), 0);
    if (optionalTotal > 50) {
      items.push({
        icon: <Lightbulb className="h-4 w-4" />,
        text: `Optional subscriptions cost ${fm(optionalTotal)}/mo. Cutting some could free up cash for goals.`,
        tone: "opportunity",
      });
    }

    // No goals yet
    const activeGoals = (data.goals || []).filter(g => g.status === "active");
    if (activeGoals.length === 0 && effectiveBalance > 0) {
      items.push({
        icon: <Target className="h-4 w-4" />,
        text: `You haven't set any goals yet. Want to plan for something exciting? Tap the + button to get started.`,
        tone: "opportunity",
      });
    }

    return items;
  }, [monthlyAnalysis, data, effectiveBalance, fm]);

  // === WARNINGS ===
  const warningInsights = useMemo(() => {
    const items: Insight[] = [];
    const monthSubs = getMonthSubscriptionTotal(data.subscriptions);

    // Subscription burden
    if (monthlyAnalysis.current.totalIncome > 0) {
      const subPct = (monthSubs / monthlyAnalysis.current.totalIncome) * 100;
      if (subPct > 30) {
        items.push({
          icon: <CreditCard className="h-4 w-4" />,
          text: `Your subscriptions are stacking up — ${Math.round(subPct)}% of your income. Do you really use all of them?`,
          tone: "warning",
        });
      }
    }

    // Upcoming shortfall
    if (riskDate) {
      const days = daysBetween(today, riskDate);
      if (days > 0 && days <= 60) {
        items.push({
          icon: <AlertTriangle className="h-4 w-4" />,
          text: `Heads up — your balance could dip negative in ${days} days (${formatDate(riskDate)}). Let's plan ahead.`,
          tone: "danger",
        });
      }
    }

    // Trial endings
    for (const sub of data.subscriptions) {
      if (sub.isTrial && sub.trialEndDate) {
        const days = daysBetween(today, sub.trialEndDate);
        if (days >= 0 && days <= 7) {
          items.push({
            icon: <Clock className="h-4 w-4" />,
            text: `${sub.name} trial ends ${days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`} — cancel before the charge kicks in if you don't need it.`,
            tone: "warning",
          });
        }
      }
    }

    // Cheque reminders
    for (const entry of data.entries) {
      if (entry.isCheque && entry.includeInForecast) {
        const days = daysBetween(today, entry.date);
        if (days >= 0 && days <= 14) {
          items.push({
            icon: <FileText className="h-4 w-4" />,
            text: `Cheque for ${entry.label} is due ${days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`}. Make sure funds are ready.`,
            tone: "warning",
          });
        }
      }
    }

    // Debt reminders
    for (const entry of data.entries) {
      if (entry.debtLinkId && entry.includeInForecast) {
        const days = daysBetween(today, entry.date);
        if (days >= 0 && days <= 14) {
          items.push({
            icon: <Scale className="h-4 w-4" />,
            text: `${entry.debtType === "repayment" ? "Repayment" : "Recovery"} for ${entry.label} is coming up ${days === 0 ? "today" : `in ${days} day${days !== 1 ? "s" : ""}`}.`,
            tone: "warning",
          });
        }
      }
    }

    // Card bill reminders
    const cardSubs = data.subscriptions.filter(s => s.account === "creditCard" && s.includeInForecast);
    const cardEntries = data.entries.filter(e => e.account === "creditCard" && e.includeInForecast && e.amount < 0);
    if (cardSubs.length + cardEntries.length > 0) {
      const cardTotal = cardSubs.reduce((s, sub) => s + toMonthlyAmount(sub.amount, sub.frequency), 0) +
        cardEntries.reduce((s, e) => s + toMonthlyAmount(Math.abs(e.amount), e.frequency), 0);
      if (cardTotal > 0) {
        items.push({
          icon: <CreditCard className="h-4 w-4" />,
          text: `Your credit card has about ${fm(cardTotal)}/mo in charges. Keep an eye on the bill date.`,
          tone: "neutral",
        });
      }
    }

    return items;
  }, [data, riskDate, today, fm, monthlyAnalysis]);

  // === GOAL NUDGES ===
  const goalInsights = useMemo(() => {
    const items: Insight[] = [];
    const activeGoals = (data.goals || []).filter(g => g.status === "active");

    for (const goal of activeGoals.slice(0, 2)) {
      const monthsLeft = Math.max(0, Math.round(daysBetween(today, goal.targetDate) / 30));
      if (monthsLeft <= 3 && monthsLeft > 0) {
        items.push({
          icon: <Target className="h-4 w-4" />,
          text: `Your "${goal.name}" goal is just ${monthsLeft} month${monthsLeft !== 1 ? "s" : ""} away! You're almost there 🎉`,
          tone: "positive",
        });
      } else if (monthsLeft > 3) {
        items.push({
          icon: <Target className="h-4 w-4" />,
          text: `"${goal.name}" is progressing — ${monthsLeft} months to go. Stay consistent!`,
          tone: "neutral",
        });
      }
    }

    // Liability payoff progress
    const activePayoffs = (data.liabilityPayoffs || []).filter(p => p.status === "active");
    for (const payoff of activePayoffs.slice(0, 1)) {
      const monthsLeft = Math.max(0, Math.round(daysBetween(today, payoff.targetDate) / 30));
      items.push({
        icon: <ShieldCheck className="h-4 w-4" />,
        text: `${payoff.name} payoff: ${monthsLeft} month${monthsLeft !== 1 ? "s" : ""} remaining. You're getting closer to freedom.`,
        tone: "positive",
      });
    }

    return items;
  }, [data.goals, data.liabilityPayoffs, today]);

  const sections = [
    { title: "💓 Cash Flow Pulse", insights: cashFlowInsights, emoji: "💓" },
    { title: "📊 Spending Pulse", insights: spendingInsights, emoji: "📊" },
    { title: "⚠️ Heads Up", insights: warningInsights, emoji: "⚠️" },
    { title: "✨ Opportunities", insights: opportunityInsights, emoji: "✨" },
    { title: "🎯 Goals & Progress", insights: goalInsights, emoji: "🎯" },
  ].filter(s => s.insights.length > 0);

  if (sections.length === 0) {
    return (
      <Card className="finnyland-card">
        <CardContent className="py-8 text-center">
          <div className="animate-float mb-3">
            <span className="text-4xl">🌿</span>
          </div>
          <p className="text-base font-semibold text-foreground mb-1">Welcome to FinnyLand!</p>
          <p className="text-sm text-muted-foreground">
            Start adding your income and expenses using the + button below, and we'll give you personalized insights here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <div key={si} className="space-y-2 animate-fade-in" style={{ animationDelay: `${si * 80}ms` }}>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 px-1">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.insights.map((insight, i) => (
              <Card
                key={i}
                className={`finnyland-card overflow-hidden ${toneStyles[insight.tone]}`}
              >
                <CardContent className="flex items-start gap-3 p-3.5">
                  <div className={`mt-0.5 shrink-0 ${toneIcons[insight.tone]}`}>
                    {insight.icon}
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">
                    {insight.text}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
