export const TAX_BRACKETS = [
  { limit: 5000, rate: 0 },
  { limit: 20000, rate: 0.01 },
  { limit: 35000, rate: 0.03 },
  { limit: 50000, rate: 0.06 },
  { limit: 70000, rate: 0.11 },
  { limit: 100000, rate: 0.19 },
  { limit: 400000, rate: 0.25 },
  { limit: 600000, rate: 0.26 },
  { limit: 2000000, rate: 0.28 },
  { limit: Infinity, rate: 0.3 },
] as const;

export const INDIVIDUAL_RELIEF = 9000;
export const SPOUSE_RELIEF = 4000;
export const CHILD_RELIEF = 2000;
export const EPF_RELIEF_CAP = 4000;
export const TAX_REBATE_THRESHOLD = 35000;
export const TAX_REBATE_AMOUNT = 400;
