import { create } from "zustand";
import { calcAllDeductions, type Deductions } from "@/lib/calculations/deductions";
import {
  calcTakeHome,
  calcVariablePool,
  calcDailyBudget,
  calcSavingsAmount,
  getDaysInMonth,
} from "@/lib/calculations/budget";

export interface Profile {
  id: string;
  name: string;
  grossIncome: number;
  epfRate: number;
  maritalStatus: "single" | "married";
  numChildren: number;
  onboardingComplete: boolean;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  icon?: string;
}

export interface SavingsTarget {
  id: string;
  mode: "percentage" | "amount";
  value: number;
  computedAmount: number;
}

export interface Envelope {
  id: string;
  name: string;
  icon: string;
  monthlyBudget: number;
  percentage: number;
  sortOrder: number;
  color?: string;
}

export interface Transaction {
  id: string;
  envelopeId: string;
  envelopeName: string;
  envelopeIcon: string;
  amount: number;
  description?: string;
  transactionDate: string;
  transactionTime: string;
}

interface BudgetState {
  // Data
  profile: Profile | null;
  deductions: Deductions | null;
  fixedExpenses: FixedExpense[];
  savingsTarget: SavingsTarget | null;
  envelopes: Envelope[];
  transactions: Transaction[];

  // Computed
  takeHome: number;
  variablePool: number;
  dailyBudget: number;
  fixedExpensesTotal: number;
  spentToday: number;
  remainingToday: number;
  ringPercentage: number;
  spentThisWeek: number;
  weeklyBudget: number;
  remainingThisWeek: number;

  // Actions
  setProfile: (profile: Profile) => void;
  setFixedExpenses: (expenses: FixedExpense[]) => void;
  setSavingsTarget: (target: SavingsTarget) => void;
  setEnvelopes: (envelopes: Envelope[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  recalculate: () => void;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return monday.toISOString().split("T")[0];
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  profile: null,
  deductions: null,
  fixedExpenses: [],
  savingsTarget: null,
  envelopes: [],
  transactions: [],

  takeHome: 0,
  variablePool: 0,
  dailyBudget: 0,
  fixedExpensesTotal: 0,
  spentToday: 0,
  remainingToday: 0,
  ringPercentage: 1,
  spentThisWeek: 0,
  weeklyBudget: 0,
  remainingThisWeek: 0,

  setProfile: (profile) => {
    const deductions = calcAllDeductions(
      profile.grossIncome,
      profile.epfRate,
      profile.maritalStatus,
      profile.numChildren
    );
    set({ profile, deductions });
    get().recalculate();
  },

  setFixedExpenses: (fixedExpenses) => {
    set({ fixedExpenses });
    get().recalculate();
  },

  setSavingsTarget: (savingsTarget) => {
    set({ savingsTarget });
    get().recalculate();
  },

  setEnvelopes: (envelopes) => {
    set({ envelopes });
  },

  setTransactions: (transactions) => {
    set({ transactions });
    get().recalculate();
  },

  addTransaction: (transaction) => {
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    }));
    get().recalculate();
  },

  recalculate: () => {
    const { profile, deductions, fixedExpenses, savingsTarget, transactions } =
      get();

    if (!profile || !deductions) return;

    const fixedExpensesTotal = fixedExpenses.reduce(
      (sum, e) => sum + e.amount,
      0
    );
    const savingsAmount = savingsTarget?.computedAmount ?? 0;
    const takeHome = calcTakeHome(profile.grossIncome, deductions.total);
    const variablePool = calcVariablePool(
      takeHome,
      fixedExpensesTotal,
      savingsAmount
    );

    const now = new Date();
    const daysInMonth = getDaysInMonth(now.getFullYear(), now.getMonth());
    const dailyBudget = calcDailyBudget(variablePool, daysInMonth);
    const weeklyBudget = Math.round(dailyBudget * 7 * 100) / 100;

    const today = getToday();
    const weekStart = getWeekStart();

    const spentToday = transactions
      .filter((t) => t.transactionDate === today)
      .reduce((sum, t) => sum + t.amount, 0);

    const spentThisWeek = transactions
      .filter((t) => t.transactionDate >= weekStart)
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingToday = Math.round((dailyBudget - spentToday) * 100) / 100;
    const remainingThisWeek =
      Math.round((weeklyBudget - spentThisWeek) * 100) / 100;
    const ringPercentage =
      dailyBudget > 0
        ? Math.max(0, Math.min(1, remainingToday / dailyBudget))
        : 1;

    set({
      takeHome,
      variablePool,
      dailyBudget,
      fixedExpensesTotal,
      spentToday,
      remainingToday,
      ringPercentage,
      weeklyBudget,
      spentThisWeek,
      remainingThisWeek,
    });
  },
}));
