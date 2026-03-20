"use client";

import { useBudgetStore, type Transaction } from "@/stores/budget-store";
import { CATEGORY_ICONS } from "@/lib/constants/categories";

interface TransactionListProps {
  isWeekly: boolean;
}

export function TransactionList({ isWeekly }: TransactionListProps) {
  const { transactions } = useBudgetStore();

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const weekStart = (() => {
    const d = new Date(now);
    const day = d.getDay();
    const diff = day === 0 ? 6 : day - 1;
    d.setDate(d.getDate() - diff);
    return d.toISOString().split("T")[0];
  })();

  const filtered = transactions.filter((t) =>
    isWeekly ? t.transactionDate >= weekStart : t.transactionDate === today
  );

  if (filtered.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No transactions {isWeekly ? "this week" : "today"}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filtered.map((t) => (
        <TransactionRow key={t.id} transaction={t} />
      ))}
    </div>
  );
}

function TransactionRow({ transaction }: { transaction: Transaction }) {
  const time = transaction.transactionTime.slice(0, 5);
  const ampm =
    parseInt(time.split(":")[0]) >= 12 ? "PM" : "AM";
  const hour12 = parseInt(time.split(":")[0]) % 12 || 12;
  const displayTime = `${hour12}:${time.split(":")[1]} ${ampm}`;

  return (
    <div className="flex items-center justify-between rounded-xl bg-surface-card px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground w-18">{displayTime}</span>
        <span className="text-base font-semibold">
          {CATEGORY_ICONS[transaction.envelopeIcon] || ""}{" "}
          {transaction.envelopeName}
        </span>
      </div>
      <span className="text-base font-bold">RM {transaction.amount}</span>
    </div>
  );
}
