export function calcTakeHome(gross: number, totalDeductions: number): number {
  return Math.round((gross - totalDeductions) * 100) / 100;
}

export function calcVariablePool(
  takeHome: number,
  fixedExpensesTotal: number,
  savingsAmount: number
): number {
  return Math.round((takeHome - fixedExpensesTotal - savingsAmount) * 100) / 100;
}

export function calcDailyBudget(variablePool: number, daysInMonth: number): number {
  return Math.round((variablePool / daysInMonth) * 100) / 100;
}

export function calcWeeklyBudget(dailyBudget: number): number {
  return Math.round(dailyBudget * 7 * 100) / 100;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getDaysRemainingInMonth(date: Date = new Date()): number {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return lastDay - date.getDate();
}

export function calcSavingsAmount(
  mode: "percentage" | "amount",
  value: number,
  takeHome: number
): number {
  if (mode === "amount") return value;
  return Math.round(takeHome * (value / 100) * 100) / 100;
}
