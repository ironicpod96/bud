import {
  TAX_BRACKETS,
  INDIVIDUAL_RELIEF,
  TAX_REBATE_THRESHOLD,
  TAX_REBATE_AMOUNT,
} from "@/lib/constants/tax-brackets";

export function calcEPF(grossMonthly: number, rate: number = 11): number {
  return Math.round(grossMonthly * (rate / 100) * 100) / 100;
}

export function calcSOCSO(grossMonthly: number): number {
  return Math.round(Math.min(grossMonthly * 0.005, 9.0) * 100) / 100;
}

export function calcEIS(grossMonthly: number): number {
  return Math.round(Math.min(grossMonthly * 0.002, 10.0) * 100) / 100;
}

export function estimateMonthlyPCB(
  grossMonthly: number,
): number {
  const annualGross = grossMonthly * 12;

  // Only individual relief (RM 9,000) is applied for PCB estimation
  const chargeableIncome = Math.max(0, annualGross - INDIVIDUAL_RELIEF);

  let annualTax = 0;
  let prev = 0;
  for (const bracket of TAX_BRACKETS) {
    if (chargeableIncome <= prev) break;
    const taxable = Math.min(chargeableIncome, bracket.limit) - prev;
    annualTax += taxable * bracket.rate;
    prev = bracket.limit;
  }

  if (chargeableIncome <= TAX_REBATE_THRESHOLD) {
    annualTax = Math.max(0, annualTax - TAX_REBATE_AMOUNT);
  }

  return Math.round((annualTax / 12) * 100) / 100;
}

export interface Deductions {
  epf: number;
  socso: number;
  eis: number;
  pcb: number;
  total: number;
}

export function calcAllDeductions(
  grossMonthly: number,
  epfRate: number = 11,
  maritalStatus: "single" | "married" = "single",
  numChildren: number = 0
): Deductions {
  const epf = calcEPF(grossMonthly, epfRate);
  const socso = calcSOCSO(grossMonthly);
  const eis = calcEIS(grossMonthly);
  const pcb = estimateMonthlyPCB(grossMonthly);
  return {
    epf,
    socso,
    eis,
    pcb,
    total: Math.round((epf + socso + eis + pcb) * 100) / 100,
  };
}
