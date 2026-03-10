import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingDown, TrendingUp, Heart, Target, AlertTriangle,
  Sparkles, Flame, ShieldCheck, Lightbulb, Clock, CreditCard,
  FileText, Scale, Leaf, Zap, Bell, Briefcase, Link2, Trophy,
} from "lucide-react";
import type { AppData } from "@/lib/finance-types";
import { generateInsights, type Insight, type InsightTone, type InsightCategory } from "@/lib/insight-engine";

interface OverviewInsightsProps {
  data: AppData;
}

const toneStyles: Record<InsightTone, string> = {
  positive: "border-l-4 border-l-success bg-success/5",
  neutral: "border-l-4 border-l-primary bg-primary/5",
  warning: "border-l-4 border-l-warning bg-warning/5",
  danger: "border-l-4 border-l-destructive bg-destructive/5",
  opportunity: "border-l-4 border-l-golden bg-golden/5",
};

const toneTextColors: Record<InsightTone, string> = {
  positive: "text-success",
  neutral: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
  opportunity: "text-golden",
};

const sectionConfig: { key: string; title: string; emoji: string; categories: InsightCategory[] }[] = [
  { key: "warnings", title: "Heads Up", emoji: "⚠️", categories: ["warning"] },
  { key: "cashflow", title: "Cash Flow Pulse", emoji: "💓", categories: ["cashflow"] },
  { key: "spending", title: "Spending Pulse", emoji: "📊", categories: ["spending"] },
  { key: "opportunities", title: "Opportunities", emoji: "✨", categories: ["opportunity"] },
  { key: "goals", title: "Goals & Progress", emoji: "🎯", categories: ["goal"] },
  { key: "family", title: "Family", emoji: "👨‍👩‍👧", categories: ["family"] },
  { key: "debt", title: "Debt Watch", emoji: "⛓️", categories: ["debt"] },
  { key: "reminders", title: "Reminders", emoji: "🔔", categories: ["reminder"] },
];

function InsightCard({ insight, index = 0 }: { insight: Insight; index?: number }) {
  return (
    <Card
      className={`insight-card overflow-hidden ${toneStyles[insight.tone]} animate-slide-up-fade`}
      style={{ animationDelay: `${index * 50}ms`, opacity: 0 }}
    >
      <CardContent className="flex items-start gap-3 p-3.5">
        <span className="text-base mt-0.5 shrink-0">{insight.icon}</span>
        <p className="text-sm text-foreground leading-relaxed">{insight.text}</p>
      </CardContent>
    </Card>
  );
}

export function OverviewInsights({ data }: OverviewInsightsProps) {
  const insights = useMemo(() => generateInsights(data), [data]);

  // If no insights at all, show welcome
  if (insights.all.length === 0) {
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

  // Build sections from the engine output
  const sections = sectionConfig
    .map(sec => ({
      ...sec,
      insights: (insights as any)[sec.key] as Insight[] | undefined,
    }))
    .filter(sec => sec.insights && sec.insights.length > 0);

  return (
    <div className="space-y-5">
      {/* Top Priority Insights — hero banner */}
      {insights.top.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1 animate-fade-in">
            What matters now
          </h3>
          {insights.top.map((insight, i) => (
            <InsightCard key={`top-${i}`} insight={insight} index={i} />
          ))}
        </div>
      )}

      {/* Categorized Sections */}
      {sections.map((section, si) => {
        // Skip if all insights here are already shown in top
        const topTexts = new Set(insights.top.map(t => t.text));
        const remaining = section.insights!.filter(i => !topTexts.has(i.text));
        if (remaining.length === 0) return null;

        return (
          <div
            key={section.key}
            className="space-y-2 animate-slide-up-fade"
            style={{ animationDelay: `${(si + 1) * 80}ms`, opacity: 0 }}
          >
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 px-1">
              <span>{section.emoji}</span> {section.title}
            </h3>
            <div className="space-y-2">
              {remaining.map((insight, i) => (
                <InsightCard key={`${section.key}-${i}`} insight={insight} index={i} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
