"use client";

import { useRouter } from "next/navigation";
import { useBudgetStore } from "@/stores/budget-store";
import { createClient } from "@/lib/supabase/client";
import { formatRM } from "@/components/shared/amount-display";
import { X, RotateCcw, LogOut } from "lucide-react";

interface ManageOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function ManageOverlay({ open, onClose }: ManageOverlayProps) {
  const {
    profile,
    deductions,
    takeHome,
    fixedExpensesTotal,
    fixedExpenses,
    savingsTarget,
    variablePool,
    envelopes,
  } = useBudgetStore();
  const router = useRouter();
  const supabase = createClient();

  if (!open || !profile) return null;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.refresh();
  }

  async function handleReset() {
    if (!profile) return;
    await supabase
      .from("profiles")
      .update({ onboarding_complete: false })
      .eq("id", profile.id);
    router.push("/onboarding/income");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface-bg overflow-y-auto">
      <div className="mx-auto max-w-[430px] px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-black tracking-tight">Manage</h1>
          <button onClick={onClose} className="p-2 text-muted-foreground">
            <X size={24} />
          </button>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl bg-surface-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">{profile.name}</h2>
            <button className="text-sm text-muted-foreground">Edit</button>
          </div>

          <div className="border-t border-border pt-3">
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs text-muted-foreground">Monthly Income</p>
                <p className="text-xl font-black">
                  {formatRM(profile.grossIncome)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  EPF Contribution
                </p>
                <p className="text-xl font-black">{profile.epfRate}%</p>
              </div>
            </div>
          </div>

          {deductions && (
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Monthly Deductions
                </span>
                <span className="text-sm font-medium">
                  {formatRM(deductions.total)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Take-Home Card */}
        <div className="rounded-2xl bg-surface-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Take-Home</h2>
            <span className="text-xl font-black">{formatRM(takeHome)}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">
                Fixed Expenses
              </span>
              <span className="text-sm font-medium">
                {formatRM(fixedExpensesTotal)}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">
                Savings Target{" "}
                {savingsTarget?.mode === "percentage" &&
                  `· ${savingsTarget.value}%`}
              </span>
              <span className="text-sm font-medium">
                {formatRM(savingsTarget?.computedAmount ?? 0)}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Variable Expenses</span>
                <button onClick={() => { router.push('/onboarding/variable'); onClose(); }} className="text-sm text-muted-foreground underline">Edit</button>
              </div>
              <span className="text-sm font-medium">
                {formatRM(variablePool)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleReset}
          className="flex w-full items-center gap-3 rounded-2xl bg-surface-card px-5 py-4 mb-3"
        >
          <RotateCcw size={18} />
          <span className="text-sm font-medium">Reset Budget Setup</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl bg-surface-card px-5 py-4 text-accent-red"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Log Out</span>
        </button>
      </div>
    </div>
  );
}
