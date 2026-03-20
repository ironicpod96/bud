"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcAllDeductions } from "@/lib/calculations/deductions";
import { calcTakeHome, calcVariablePool } from "@/lib/calculations/budget";
import {
  DEFAULT_CATEGORIES,
  CATEGORY_ICONS,
  getSuggestedPercentages,
} from "@/lib/constants/categories";
import { Button } from "@/components/ui/button";
import { formatRM } from "@/components/shared/amount-display";
import { OnboardingNav } from "@/components/onboarding/nav-buttons";
import { finishOnboarding } from "@/lib/onboarding-helpers";

interface CategoryAllocation {
  name: string;
  icon: string;
  percentage: number;
}

export default function VariablePage() {
  const [categories, setCategories] = useState<CategoryAllocation[]>([]);
  const [variablePool, setVariablePool] = useState(0);
  const [loading, setLoading] = useState(false);
  const [grossIncome, setGrossIncome] = useState<number | null>(null);
  const [remainderAction, setRemainderAction] = useState<'none' | 'savings' | 'spread'>('none');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("gross_income, epf_rate")
        .eq("id", user.id)
        .single();
      if (!profile) return;

      const deductions = calcAllDeductions(
        profile.gross_income,
        profile.epf_rate
      );
      const takeHome = calcTakeHome(profile.gross_income, deductions.total);

      const { data: fixed } = await supabase
        .from("fixed_expenses")
        .select("amount")
        .eq("profile_id", user.id);
      const fixedTotal = (fixed || []).reduce(
        (sum: number, e: { amount: number }) => sum + e.amount,
        0
      );

      const { data: savings } = await supabase
        .from("savings_target")
        .select("computed_amount")
        .eq("profile_id", user.id)
        .single();
      const savingsAmount = savings?.computed_amount || 0;

      const pool = calcVariablePool(takeHome, fixedTotal, savingsAmount);
      setVariablePool(pool);

      // Load existing envelopes if user is coming back
      const { data: existingEnvelopes } = await supabase
        .from("envelopes")
        .select("name, icon, percentage")
        .eq("profile_id", user.id)
        .order("sort_order");

      if (existingEnvelopes && existingEnvelopes.length > 0) {
        setCategories(
          existingEnvelopes.map((e) => ({
            name: e.name,
            icon: e.icon,
            percentage: e.percentage,
          }))
        );
        return;
      }

      const suggested = getSuggestedPercentages(profile.gross_income);
      setCategories(
        DEFAULT_CATEGORIES.map((c) => ({
          name: c.name,
          icon: c.icon,
          percentage: suggested[c.name] || c.defaultPercentage,
        }))
      );
    }
    loadData();
  }, [supabase]);

  const totalPct = categories.reduce((sum, c) => sum + c.percentage, 0);

  function updatePercentage(index: number, newPct: number) {
    const updated = [...categories];
    updated[index] = { ...updated[index], percentage: Math.max(0, Math.min(100, newPct)) };
    setCategories(updated);
  }

  function suggestDistribution() {
    if (!grossIncome) return;
    const suggested = getSuggestedPercentages(grossIncome);
    setCategories(
      DEFAULT_CATEGORIES.map((c) => ({
        name: c.name,
        icon: c.icon,
        percentage: suggested[c.name] || c.defaultPercentage,
      }))
    );
  }

  function distributeRemainderAcrossCategories() {
    const total = categories.reduce((s, c) => s + c.percentage, 0);
    if (total === 0) return;
    const remainder = 100 - total;
    if (remainder === 0) return;

    // Spread remainder proportionally based on current percentages; if all zero, spread evenly
    let updated: CategoryAllocation[];
    const nonZero = categories.some((c) => c.percentage > 0);
    if (!nonZero) {
      const add = Math.floor(remainder / categories.length);
      updated = categories.map((c, i) => ({ ...c, percentage: c.percentage + add }));
    } else {
      updated = categories.map((c) => {
        const share = c.percentage / total;
        return { ...c, percentage: Math.round(c.percentage + share * remainder) };
      });
    }

    // Fix rounding to make sum exactly 100
    let newTotal = updated.reduce((s, c) => s + c.percentage, 0);
    const diff = 100 - newTotal;
    if (diff !== 0) {
      updated[updated.length - 1].percentage += diff;
    }

    setCategories(updated);
    setRemainderAction('none');
  }

  async function handleContinue() {
    const total = categories.reduce((sum, c) => sum + c.percentage, 0);
    if (total !== 100 && remainderAction === 'none') return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let toInsert = categories.map((c, i) => ({
      profile_id: user.id,
      name: c.name,
      icon: c.icon,
      percentage: c.percentage,
      monthly_budget: Math.round(variablePool * (c.percentage / 100) * 100) / 100,
      sort_order: i,
    }));

    if (total !== 100 && remainderAction === 'spread') {
      // normalize to 100%
      const factor = 100 / total;
      const adjusted = categories.map((c) => ({ ...c, percentage: Math.round(c.percentage * factor) }));
      let s = adjusted.reduce((n, x) => n + x.percentage, 0);
      if (s !== 100) adjusted[adjusted.length - 1].percentage += 100 - s;
      toInsert = adjusted.map((c, i) => ({
        profile_id: user.id,
        name: c.name,
        icon: c.icon,
        percentage: c.percentage,
        monthly_budget: Math.round(variablePool * (c.percentage / 100) * 100) / 100,
        sort_order: i,
      }));
    }

    if (total !== 100 && remainderAction === 'savings') {
      // move remainder to savings_target.computed_amount
      const remainderPct = 100 - total;
      const remainderAmount = Math.round(variablePool * (remainderPct / 100) * 100) / 100;

      const { data: existing } = await supabase
        .from('savings_target')
        .select('mode, value, computed_amount')
        .eq('profile_id', user.id)
        .single();

      const newComputed = (existing?.computed_amount || 0) + remainderAmount;
      await supabase.from('savings_target').upsert(
        {
          profile_id: user.id,
          mode: existing?.mode || 'amount',
          value: existing?.value ?? newComputed,
          computed_amount: newComputed,
        },
        { onConflict: 'profile_id' }
      );
    }

    await supabase.from('envelopes').delete().eq('profile_id', user.id);
    await supabase.from('envelopes').insert(toInsert);

    // Mark onboarding complete
    await supabase
      .from('profiles')
      .update({ onboarding_complete: true })
      .eq('id', user.id);

    // Create first budget period
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    await supabase.from('budget_periods').insert({
      profile_id: user.id,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      total_variable_budget: variablePool,
      days_in_period: daysInMonth,
    });

    router.push('/');
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingNav
        backHref="/onboarding/savings"
        onSkip={async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;
          await finishOnboarding(supabase, user.id);
          router.push("/");
        }}
      />
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">Step 4 of 4</p>
        <h1 className="text-4xl font-black tracking-tight">
          Spending categories
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Split {formatRM(variablePool)} across your categories (food, transportation, personal, fun, etc.)
        </p>
        <div className="flex items-center gap-3 mt-3">
          <Button onClick={suggestDistribution} className="h-9">Suggest distribution</Button>
          <div className="text-sm text-muted-foreground">Remainder:
            <select value={remainderAction} onChange={(e) => setRemainderAction(e.target.value as any)} className="ml-2 rounded-md bg-surface-card px-2 py-1 text-sm">
              <option value="none">Require 100%</option>
              <option value="savings">Put remainder into savings</option>
              <option value="spread">Spread remainder across categories</option>
            </select>
          </div>
          {remainderAction === 'spread' && (
            <button onClick={distributeRemainderAcrossCategories} className="text-sm text-foreground underline">Distribute remainder</button>
          )}
        </div>
      </div>

      <div className="my-4 space-y-4">
        {categories.map((cat, i) => (
          <div key={cat.name} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{CATEGORY_ICONS[cat.icon] || "📦"}</span>
                <span className="font-medium">{cat.name}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatRM(
                  Math.round(variablePool * (cat.percentage / 100) * 100) / 100
                )}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="100"
                value={cat.percentage}
                onChange={(e) => updatePercentage(i, parseInt(e.target.value))}
                className="flex-1 accent-foreground"
              />
              <span className="w-10 text-right text-sm font-medium">
                {cat.percentage}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div
        className={`text-center text-sm font-medium ${
          totalPct === 100 ? "text-accent-green" : "text-accent-red"
        }`}
      >
        Total: {totalPct}%{" "}
        {totalPct !== 100 && `(${totalPct < 100 ? "need" : "over by"} ${Math.abs(100 - totalPct)}%)`}
      </div>

      <div className="mt-auto space-y-4 pt-6">
        <Button
          onClick={handleContinue}
          disabled={totalPct !== 100 || loading}
          className="h-12 w-full text-base font-semibold"
        >
          {loading ? "Setting up..." : "Start Budgeting"}
        </Button>
      </div>
    </div>
  );
}
