"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcAllDeductions } from "@/lib/calculations/deductions";
import { calcTakeHome } from "@/lib/calculations/budget";
import { Button } from "@/components/ui/button";
import { formatRM } from "@/components/shared/amount-display";
import { OnboardingNav } from "@/components/onboarding/nav-buttons";

export default function SavingsPage() {
  const [mode, setMode] = useState<"percentage" | "amount">("percentage");
  const [value, setValue] = useState(10);
  const [takeHome, setTakeHome] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
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
      setTakeHome(calcTakeHome(profile.gross_income, deductions.total));

      // Load existing savings target if user is coming back
      const { data: existing } = await supabase
        .from("savings_target")
        .select("mode, value")
        .eq("profile_id", user.id)
        .single();
      if (existing) {
        setMode(existing.mode as "percentage" | "amount");
        setValue(existing.value);
      }
    }
    loadProfile();
  }, [supabase]);

  const computedAmount =
    mode === "percentage"
      ? Math.round(takeHome * (value / 100) * 100) / 100
      : value;
  const computedPct =
    mode === "amount" && takeHome > 0
      ? Math.round((value / takeHome) * 100)
      : value;

  async function handleContinue() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("savings_target").upsert(
      {
        profile_id: user.id,
        mode,
        value,
        computed_amount: mode === "percentage" ? computedAmount : value,
      },
      { onConflict: "profile_id" }
    );

    router.push("/onboarding/variable");
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingNav
        backHref="/onboarding/fixed"
        onSkip={() => router.push("/onboarding/variable")}
      />
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">Step 3 of 4</p>
        <h1 className="text-4xl font-black tracking-tight">Savings target</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          How much to set aside each month
        </p>
      </div>

      {/* Mode toggle */}
      <div className="my-6 flex rounded-lg bg-surface-card p-1">
        <button
          onClick={() => setMode("percentage")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "percentage"
              ? "bg-foreground text-background"
              : "text-muted-foreground"
          }`}
        >
          Percentage
        </button>
        <button
          onClick={() => setMode("amount")}
          className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
            mode === "amount"
              ? "bg-foreground text-background"
              : "text-muted-foreground"
          }`}
        >
          Amount
        </button>
      </div>

      {/* Value control */}
      <div className="text-center my-8">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setValue(Math.max(0, value - (mode === "percentage" ? 1 : 50)))}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-xl font-medium"
          >
            −
          </button>
          <div className="min-w-[120px]">
            <span className="text-6xl font-black">
              {mode === "percentage" ? `${value}%` : formatRM(value)}
            </span>
          </div>
          <button
            onClick={() => setValue(value + (mode === "percentage" ? 1 : 50))}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-card text-xl font-medium"
          >
            +
          </button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          {mode === "percentage"
            ? `${formatRM(computedAmount)} / month`
            : `${computedPct}% of take-home pay`}
        </p>
      </div>

      <div className="mt-auto space-y-4">
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
