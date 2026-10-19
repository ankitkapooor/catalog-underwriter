import { calculateDcf, type ValuationAssumptions } from './dcf.ts';

export type SensitivityCell = {
  discountRate: number;
  terminalGrowthRate: number;
  value: number | null;
  impliedMultiple: number | null;
};

// Centred on the 8.5% / +2% base case, spanning the bear and bull settings.
export const SENSITIVITY_DISCOUNT_RATES = [
  0.065, 0.075, 0.085, 0.095, 0.105, 0.115, 0.125,
];
export const SENSITIVITY_TERMINAL_GROWTH_RATES = [
  -0.02, -0.01, 0, 0.01, 0.02, 0.03,
];

export function buildSensitivityMatrix(
  assumptions: ValuationAssumptions,
  discountRates = SENSITIVITY_DISCOUNT_RATES,
  terminalGrowthRates = SENSITIVITY_TERMINAL_GROWTH_RATES,
): SensitivityCell[][] {
  return discountRates.map((discountRate) =>
    terminalGrowthRates.map((terminalGrowthRate) => {
      if (
        discountRate + assumptions.concentrationPremium <=
        terminalGrowthRate
      ) {
        return {
          discountRate,
          terminalGrowthRate,
          value: null,
          impliedMultiple: null,
        };
      }
      const result = calculateDcf({
        ...assumptions,
        discountRate,
        terminalGrowthRate,
      });
      return {
        discountRate,
        terminalGrowthRate,
        value: result.catalogValue,
        impliedMultiple: result.impliedMultiple,
      };
    }),
  );
}
