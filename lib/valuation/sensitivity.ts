import { calculateDcf, type ValuationAssumptions } from './dcf.ts';

export type SensitivityCell = {
  discountRate: number;
  terminalGrowthRate: number;
  value: number | null;
  impliedMultiple: number | null;
};

export function buildSensitivityMatrix(
  assumptions: ValuationAssumptions,
  discountRates = [0.08, 0.09, 0.1, 0.11, 0.12, 0.13, 0.14],
  terminalGrowthRates = [-0.04, -0.03, -0.02, -0.01, 0, 0.01],
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
