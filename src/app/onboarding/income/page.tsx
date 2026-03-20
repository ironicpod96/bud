"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcAllDeductions } from "@/lib/calculations/deductions";
import { calcTakeHome } from "@/lib/calculations/budget";
import { Numpad, useNumpadAmount } from "@/components/shared/numpad";
import { Button } from "@/components/ui/button";
import { formatRM } from "@/components/shared/amount-display";
import { OnboardingNav } from "@/components/onboarding/nav-buttons";
import { finishOnboarding } from "@/lib/onboarding-helpers";

export default function IncomePage() {
  const [amountStr, setAmountStr] = useState("0");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { handleInput, handleDelete } = useNumpadAmount();

  // Load existing income if user is coming back
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("gross_income")
        .eq("id", user.id)
        .single();
      if (profile?.gross_income && profile.gross_income > 0) {
        setAmountStr(String(profile.gross_income));
      }
    }
    load();
  }, [supabase]);

  const amount = parseFloat(amountStr) || 0;
  const deductions = calcAllDeductions(amount);
  const takeHome = calcTakeHome(amount, deductions.total);

  async function handleContinue() {
    if (!showBreakdown) {
      setShowBreakdown(true);
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({
        gross_income: amount,
        epf_rate: 11,
      })
      .eq("id", user.id);

    await supabase.from("monthly_deductions").upsert(
      {
        profile_id: user.id,
        epf_amount: deductions.epf,
        socso_amount: deductions.socso,
        eis_amount: deductions.eis,
        pcb_amount: deductions.pcb,
      },
      { onConflict: "profile_id" }
    );

    router.push("/onboarding/fixed");
  }

  async function handleSkip() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await finishOnboarding(supabase, user.id);
    router.push("/");
  }

  return (
    <div className="flex flex-1 flex-col">
      <OnboardingNav onSkip={handleSkip} skipLabel="Skip setup" />
      <div className="mb-2">
        <p className="text-sm text-muted-foreground">Step 1 of 4</p>
        <h1 className="text-4xl font-black tracking-tight">
          Monthly gross income
        </h1>
      </div>

      <div className="my-8 text-center">
        <span className="text-muted-foreground text-3xl">RM</span>{" "}
        <span className="text-6xl font-black">{amountStr}</span>
      </div>

      {showBreakdown && (
        <div className="mb-6 space-y-3 rounded-xl bg-surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Monthly Deductions
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>EPF (11%)</span>
              <span>{formatRM(deductions.epf)}</span>
            </div>
            <div className="flex justify-between">
              <span>SOCSO</span>
              <span>{formatRM(deductions.socso)}</span>
            </div>
            <div className="flex justify-between">
              <span>EIS</span>
              <span>{formatRM(deductions.eis)}</span>
            </div>
            <div className="flex justify-between">
              <span>PCB (est.)</span>
              <span>{formatRM(deductions.pcb)}</span>
            </div>
            <div className="border-t border-border pt-2 flex justify-between font-semibold">
              <span>Total Deductions</span>
              <span>{formatRM(deductions.total)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-1">
              <span>Take-Home</span>
              <span className="text-accent-green">{formatRM(takeHome)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-auto space-y-4">
        {!showBreakdown && (
          <Numpad
            onInput={(key) => setAmountStr((prev) => handleInput(prev, key))}
            onDelete={() => setAmountStr((prev) => handleDelete(prev))}
          />
        )}
        <Button
          onClick={handleContinue}
          disabled={amount === 0 || loading}
          className="h-12 w-full text-base font-semibold"
        >
          {loading
            ? "Saving..."
            : showBreakdown
              ? "Continue"
              : "See Breakdown"}
        </Button>
      </div>
    </div>
  );
}
