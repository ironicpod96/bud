"use client";

import { CATEGORY_ICONS } from "@/lib/constants/categories";

interface CategoryBarProps {
  name: string;
  icon: string;
  spent: number;
  budget: number;
}

function CategoryBar({ name, icon, spent, budget }: CategoryBarProps) {
  const pct = budget > 0 ? Math.min(1, spent / budget) : 0;
  const isOver = spent > budget;

  return (
    <div className="flex items-center gap-3">
      <span className="w-6 text-center">{CATEGORY_ICONS[icon] || "📦"}</span>
      <span className="w-24 text-base font-semibold truncate">{name}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: isOver ? "var(--accent-red)" : "var(--muted-foreground)",
          }}
        />
      </div>
      <span className="w-20 text-right text-base font-medium text-muted-foreground">
        RM {Math.round(spent)}
      </span>
    </div>
  );
}

interface CategoryBarsProps {
  envelopes: Array<{
    id: string;
    name: string;
    icon: string;
    monthlyBudget: number;
  }>;
  transactionsByEnvelope: Record<string, number>;
  daysInMonth: number;
  isWeekly?: boolean;
}

export function CategoryBars({
  envelopes,
  transactionsByEnvelope,
  daysInMonth,
  isWeekly = false,
}: CategoryBarsProps) {
  return (
    <div className="space-y-3">
      {envelopes.map((env) => {
        const dailyAllocation = env.monthlyBudget / daysInMonth;
        const budget = isWeekly ? dailyAllocation * 7 : dailyAllocation;
        const spent = transactionsByEnvelope[env.id] || 0;

        return (
          <CategoryBar
            key={env.id}
            name={env.name}
            icon={env.icon}
            spent={spent}
            budget={budget}
          />
        );
      })}
    </div>
  );
}
