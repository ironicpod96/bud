"use client";

import { useState } from "react";
import { ProgressRing } from "./progress-ring";
import { CategoryBars } from "./category-bars";
import { useBudgetStore } from "@/stores/budget-store";
import { CATEGORY_ICONS } from "@/lib/constants/categories";
import { getDaysInMonth } from "@/lib/calculations/budget";
import { ChevronUp, ChevronDown } from "lucide-react";

interface MainCardProps {
  isWeekly: boolean;
}

export function MainCard({ isWeekly }: MainCardProps) {
  const [expanded, setExpanded] = useState(false);
  const {
    dailyBudget,
    remainingToday,
    ringPercentage,
    weeklyBudget,
    remainingThisWeek,
    spentThisWeek,
    spentToday,
    envelopes,
    transactions,
  } = useBudgetStore();

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-MY", {
    month: "short",
    day: "numeric",
  });
  const dayStr = now.toLocaleDateString("en-MY", { weekday: "short" });
  const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());

  const remaining = isWeekly ? remainingThisWeek : remainingToday;
  const budget = isWeekly ? weeklyBudget : dailyBudget;
  const pct = budget > 0 ? Math.max(0, Math.min(1, remaining / budget)) : 1;

  // Compute spending by envelope for category bars
  const today = now.toISOString().split("T")[0];
  const weekStart = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().split("T")[0];
  })();

  const relevantTxns = transactions.filter((t) =>
    isWeekly ? t.transactionDate >= weekStart : t.transactionDate === today
  );

  const byEnvelope: Record<string, number> = {};
  relevantTxns.forEach((t) => {
    byEnvelope[t.envelopeId] = (byEnvelope[t.envelopeId] || 0) + t.amount;
  });

  // Find most overbudget envelope for alert widget
  const alertEnvelope = envelopes.reduce<{ icon: string; overAmount: number } | null>(
    (worst, env) => {
      const dailyAlloc = env.monthlyBudget / daysInMonth;
      const spent = byEnvelope[env.id] || 0;
      const over = spent - dailyAlloc;
      if (over > 0 && (!worst || over > worst.overAmount)) {
        return { icon: CATEGORY_ICONS[env.icon] || "📦", overAmount: Math.round(over) };
      }
      return worst;
    },
    null
  );

  return (
    <div className="rounded-2xl bg-surface-card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-lg font-bold">{dateStr}</p>
          <p className="text-base text-muted-foreground">{dayStr}</p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Ring */}
      <div className="flex justify-center py-2">
        <ProgressRing percentage={pct} remaining={remaining} />
      </div>

      {/* Expanded: category bars */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border">
          <CategoryBars
            envelopes={envelopes.map((e) => ({
              id: e.id,
              name: e.name,
              icon: e.icon,
              monthlyBudget: e.monthlyBudget,
            }))}
            transactionsByEnvelope={byEnvelope}
            daysInMonth={daysInMonth}
            isWeekly={isWeekly}
          />
        </div>
      )}

      {/* Corner widgets */}
      {!expanded && (
        <div className="flex items-end justify-between mt-2">
          {/* Alert widget */}
          <div className="min-h-[24px]">
            {alertEnvelope && (
              <div className="flex items-center gap-1 text-accent-red text-sm font-medium">
                <span>{alertEnvelope.icon}</span>
                <span>+RM {alertEnvelope.overAmount}</span>
              </div>
            )}
          </div>
          {/* SOS button placeholder */}
          <div />
        </div>
      )}
    </div>
  );
}
