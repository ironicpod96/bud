"use client";

import { useEffect, useState } from "react";
import { useBudgetStore } from "@/stores/budget-store";
import { MainCard } from "@/components/home/main-card";
import { TransactionList } from "@/components/home/transaction-list";
import { AddExpenseSheet } from "@/components/sheets/add-expense-sheet";
import { ManageOverlay } from "@/components/manage/manage-overlay";
import type {
  Profile,
  FixedExpense,
  SavingsTarget,
  Envelope,
  Transaction,
} from "@/stores/budget-store";
import { DollarSign, Plus, Settings } from "lucide-react";

interface InitialData {
  profile: Profile;
  fixedExpenses: FixedExpense[];
  savingsTarget: SavingsTarget | null;
  envelopes: Envelope[];
  transactions: Transaction[];
}

export function HomeClient({ initialData }: { initialData: InitialData }) {
  const [tab, setTab] = useState<"today" | "week">("today");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const {
    setProfile,
    setFixedExpenses,
    setSavingsTarget,
    setEnvelopes,
    setTransactions,
  } = useBudgetStore();

  useEffect(() => {
    setProfile(initialData.profile);
    setFixedExpenses(initialData.fixedExpenses);
    if (initialData.savingsTarget) {
      setSavingsTarget(initialData.savingsTarget);
    }
    setEnvelopes(initialData.envelopes);
    setTransactions(initialData.transactions);
  }, [
    initialData,
    setProfile,
    setFixedExpenses,
    setSavingsTarget,
    setEnvelopes,
    setTransactions,
  ]);

  const needsSetup = initialData.profile.grossIncome === 0;

  return (
    <div className="flex flex-1 flex-col px-4 pt-6 pb-24 relative">
      {/* Tab header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <button
            onClick={() => setTab("today")}
            className={`text-4xl font-black tracking-tight transition-colors ${
              tab === "today" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setTab("week")}
            className={`text-4xl font-black tracking-tight transition-colors ${
              tab === "week" ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            This Week
          </button>
        </div>
        <button
          onClick={() => setShowManage(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border"
        >
          <DollarSign size={18} />
        </button>
      </div>

      {needsSetup ? (
        /* Empty state — user skipped onboarding */
        <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
          <div className="rounded-2xl bg-surface-card p-8 w-full">
            <h2 className="text-2xl font-black mb-2">Welcome to Bajet</h2>
            <p className="text-muted-foreground mb-6">
              Set up your income and budget to start tracking your spending.
            </p>
            <button
              onClick={() => setShowManage(true)}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-foreground text-background font-semibold"
            >
              <Settings size={18} />
              Set Up Budget
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Main card */}
          <MainCard isWeekly={tab === "week"} />

          {/* Transactions */}
          <div className="mt-6">
            <h2 className="text-base font-bold mb-3">Transactions</h2>
            <TransactionList isWeekly={tab === "week"} />
          </div>
        </>
      )}

      {/* FAB — only show when budget is set up */}
      {!needsSetup && (
        <button
          onClick={() => setShowAddExpense(true)}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Sheets & Overlays */}
      <AddExpenseSheet
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
      />
      <ManageOverlay
        open={showManage}
        onClose={() => setShowManage(false)}
      />
    </div>
  );
}
