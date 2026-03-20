"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { FIXED_EXPENSE_SUGGESTIONS } from "@/lib/constants/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRM } from "@/components/shared/amount-display";
import { X, Plus } from "lucide-react";
import { OnboardingNav } from "@/components/onboarding/nav-buttons";

interface ExpenseItem {
  name: string;
  amount: string;
  icon: string;
}

export default function FixedExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Load existing fixed expenses if user is coming back
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("fixed_expenses")
        .select("name, amount, icon")
        .eq("profile_id", user.id)
        .order("created_at");
      if (data && data.length > 0) {
        setExpenses(data.map((e) => ({ name: e.name, amount: String(e.amount), icon: e.icon || "📝" })));
      }
    }
    load();
  }, [supabase]);

  const total = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  function addExpense(name: string = "", icon: string = "📝") {
    setExpenses([...expenses, { name, amount: "", icon }]);
  }

  function removeExpense(index: number) {
    setExpenses(expenses.filter((_, i) => i !== index));
  }

  function updateExpense(index: number, field: "name" | "amount", value: string) {
    const updated = [...expenses];
    updated[index] = { ...updated[index], [field]: value };
    setExpenses(updated);
  }

  async function handleContinue() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Clear existing and insert new
    await supabase.from("fixed_expenses").delete().eq("profile_id", user.id);

    const validExpenses = expenses.filter(
      (e) => e.name.trim() && parseFloat(e.amount) > 0
    );

    if (validExpenses.length > 0) {
      await supabase.from("fixed_expenses").insert(
        validExpenses.map((e) => ({
          profile_id: user.id,
          name: e.name.trim(),
          amount: parseFloat(e.amount),
          icon: e.icon,
        }))
      );
    }

    router.push("/onboarding/savings");
  }

  const unusedSuggestions = FIXED_EXPENSE_SUGGESTIONS.filter(
    (s) => !expenses.some((e) => e.name === s.name)
  );

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingNav
        backHref="/onboarding/income"
        onSkip={() => router.push("/onboarding/savings")}
      />
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">Step 2 of 4</p>
        <h1 className="text-4xl font-black tracking-tight">Fixed expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monthly bills that stay the same
        </p>
      </div>

      <div className="my-4 space-y-3">
        {expenses.map((expense, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xl">{expense.icon}</span>
            <Input
              placeholder="Name"
              value={expense.name}
              onChange={(e) => updateExpense(i, "name", e.target.value)}
              className="flex-1 h-10 bg-surface-card"
            />
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                RM
              </span>
              <Input
                type="number"
                placeholder="0"
                value={expense.amount}
                onChange={(e) => updateExpense(i, "amount", e.target.value)}
                className="h-10 w-28 pl-9 bg-surface-card"
              />
            </div>
            <button
              onClick={() => removeExpense(i)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {unusedSuggestions.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {unusedSuggestions.map((s) => (
            <button
              key={s.name}
              onClick={() => addExpense(s.name, s.icon)}
              className="flex items-center gap-1 rounded-full bg-surface-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
            >
              <span>{s.icon}</span> {s.name}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => addExpense()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <Plus size={16} /> Add custom expense
      </button>

      <div className="mt-auto space-y-4 pt-6">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-muted-foreground">Total fixed expenses</span>
          <span>{formatRM(total)}</span>
        </div>
        <Button
          onClick={handleContinue}
          disabled={loading}
          className="h-12 w-full text-base font-semibold"
        >
          {loading ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}
