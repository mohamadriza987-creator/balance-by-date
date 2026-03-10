import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, TrendingUp, Landmark, ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";

interface GuidedTourProps {
  onComplete: () => void;
  userName?: string;
}

const TOUR_STEPS = [
  {
    icon: Sparkles,
    title: "Welcome to FinnyLand-View!",
    description: "Your friendly financial companion — track your goals, manage your money, and grow together. Let's take a quick tour!",
    color: "from-primary to-primary/60",
    emoji: "✨",
  },
  {
    icon: LayoutDashboard,
    title: "Overview",
    description: "See all your account balances at a glance — Cash, Bank, Credit Card. Track upcoming movements and your total position.",
    color: "from-blue-500 to-blue-600",
    emoji: "📊",
  },
  {
    icon: ArrowDownLeft,
    title: "Inflow",
    description: "Add income sources — salary, freelance, refunds, debt received. Set them as one-time or recurring to track money coming in.",
    color: "from-emerald-500 to-emerald-600",
    emoji: "💰",
  },
  {
    icon: ArrowUpRight,
    title: "Outflow",
    description: "Track expenses, subscriptions, and investments going out. Each entry affects your forecast and account balances.",
    color: "from-red-500 to-red-600",
    emoji: "💸",
  },
  {
    icon: ArrowLeftRight,
    title: "Transfers",
    description: "Move money between accounts — Cash to Bank, Bank to Credit Card. The app also suggests transfers when shortfalls are detected.",
    color: "from-cyan-500 to-cyan-600",
    emoji: "🔄",
  },
  {
    icon: TrendingUp,
    title: "Forecast",
    description: "See your future balance on any date. Set savings goals, plan purchases, or create debt payoff plans — all linked to your real balances.",
    color: "from-purple-500 to-purple-600",
    emoji: "📈",
  },
  {
    icon: Landmark,
    title: "Others",
    description: "View your goal-linked assets, liability payoff plans, and a complete transaction history with date filtering.",
    color: "from-amber-500 to-amber-600",
    emoji: "🏦",
  },
];

export function GuidedTour({ onComplete, userName }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TOUR_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 animate-fade-in">
        {/* Skip button */}
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground text-xs gap-1">
            Skip <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? "w-6 bg-primary" : i < currentStep ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/20"
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div key={currentStep} className="animate-fade-in">
          <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-lg">
            <div className="flex justify-center">
              <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}>
                <span className="text-3xl">{step.emoji}</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  {isFirst && userName ? `Hey ${userName}! ${step.title}` : step.title}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {!isFirst && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={() => isLast ? onComplete() : setCurrentStep(currentStep + 1)}
          >
            {isLast ? "Let's Go!" : "Next"}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
