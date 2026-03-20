"use client";

import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Numpad, useNumpadAmount } from "@/components/shared/numpad";
import { useBudgetStore } from "@/stores/budget-store";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_ICONS } from "@/lib/constants/categories";
import { X, Check } from "lucide-react";

interface AddExpenseSheetProps {
  open: boolean;
  onClose: () => void;
}

export function AddExpenseSheet({ open, onClose }: AddExpenseSheetProps) {
  const { envelopes, addTransaction } = useBudgetStore();
  const [selectedEnvelope, setSelectedEnvelope] = useState<string | null>(null);
  const [amountStr, setAmountStr] = useState("0");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { handleInput, handleDelete } = useNumpadAmount();
  const supabase = createClient();

  const activeEnvelope =
    envelopes.find((e) => e.id === selectedEnvelope) || envelopes[0];
  const amount = parseFloat(amountStr) || 0;

  function reset() {
    setAmountStr("0");
    setDescription("");
    setSelectedEnvelope(null);
  }

  async function handleAdd() {
    if (amount <= 0 || !activeEnvelope) return;

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const transactionDate = now.toISOString().split("T")[0];
    const transactionTime = now.toTimeString().split(" ")[0];

    // Get current budget period
    const { data: period } = await supabase
      .from("budget_periods")
      .select("id")
      .eq("profile_id", user.id)
      .lte("start_date", transactionDate)
      .gte("end_date", transactionDate)
      .single();

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        profile_id: user.id,
        envelope_id: activeEnvelope.id,
        budget_period_id: period?.id,
        amount,
        description: description || null,
        transaction_date: transactionDate,
        transaction_time: transactionTime,
      })
      .select()
      .single();

    if (!error && data) {
      addTransaction({
        id: data.id,
        envelopeId: activeEnvelope.id,
        envelopeName: activeEnvelope.name,
        envelopeIcon: activeEnvelope.icon,
        amount,
        description: description || undefined,
        transactionDate,
        transactionTime,
      });
    }

    setLoading(false);
    reset();
    onClose();
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl bg-surface-bg border-0 px-6 pt-6 pb-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 text-muted-foreground"
        >
          <X size={24} />
        </button>

        {/* Amount display */}
        <div className="flex items-start justify-between mt-4 mb-1">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl text-muted-foreground font-normal">RM</span>
              <span className="text-6xl font-black">{amountStr}</span>
            </div>
            {activeEnvelope && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <span>{CATEGORY_ICONS[activeEnvelope.icon] || "📦"}</span>
                <span>{activeEnvelope.name}</span>
              </div>
            )}
          </div>
          {activeEnvelope && (
            <span className="text-4xl">
              {CATEGORY_ICONS[activeEnvelope.icon] || "📦"}
            </span>
          )}
        </div>

        {/* Category picker */}
        <div className="flex gap-3 overflow-x-auto py-3 mb-2 no-scrollbar">
          {envelopes.map((env) => (
            <button
              key={env.id}
              onClick={() => setSelectedEnvelope(env.id)}
              className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs transition-colors shrink-0 ${
                (selectedEnvelope || envelopes[0]?.id) === env.id
                  ? "bg-foreground text-background"
                  : "bg-surface-card"
              }`}
            >
              <span className="text-lg">{CATEGORY_ICONS[env.icon] || "📦"}</span>
              <span>{env.name}</span>
            </button>
          ))}
        </div>

        {/* Description */}
        <Input
          placeholder="Add description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-4 bg-surface-card border-0 h-10"
        />

        {/* Numpad */}
        <Numpad
          onInput={(key) => setAmountStr((prev) => handleInput(prev, key))}
          onDelete={() => setAmountStr((prev) => handleDelete(prev))}
        />

        {/* Submit */}
        <Button
          onClick={handleAdd}
          disabled={amount <= 0 || loading}
          className="mt-4 h-12 w-full text-base font-semibold"
        >
          <Check size={18} className="mr-2" />
          {loading ? "Adding..." : "Add Expense"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
