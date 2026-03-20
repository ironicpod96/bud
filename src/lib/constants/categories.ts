export interface DefaultCategory {
  name: string;
  icon: string;
  defaultPercentage: number;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Food", icon: "utensils", defaultPercentage: 35 },
  { name: "Transport", icon: "car", defaultPercentage: 20 },
  { name: "Groceries", icon: "shopping-cart", defaultPercentage: 15 },
  { name: "Personal", icon: "user", defaultPercentage: 15 },
  { name: "Fun", icon: "party-popper", defaultPercentage: 15 },
];

export const CATEGORY_ICONS: Record<string, string> = {
  utensils: "🍴",
  car: "🚗",
  "shopping-cart": "🛒",
  user: "👤",
  "party-popper": "🎉",
};

// Smart % suggestions based on Malaysian income tiers
export function getSuggestedPercentages(grossIncome: number): Record<string, number> {
  if (grossIncome < 3000) {
    return { Food: 40, Transport: 20, Groceries: 15, Personal: 15, Fun: 10 };
  }
  if (grossIncome <= 6000) {
    return { Food: 35, Transport: 20, Groceries: 15, Personal: 15, Fun: 15 };
  }
  if (grossIncome <= 10000) {
    return { Food: 30, Transport: 18, Groceries: 17, Personal: 18, Fun: 17 };
  }
  return { Food: 25, Transport: 15, Groceries: 15, Personal: 20, Fun: 25 };
}

export const FIXED_EXPENSE_SUGGESTIONS = [
  { name: "Rent / Mortgage", icon: "🏠" },
  { name: "Car Loan", icon: "🚗" },
  { name: "Insurance", icon: "🛡️" },
  { name: "Utilities", icon: "💡" },
  { name: "Internet / Phone", icon: "📱" },
];
