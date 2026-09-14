import { calculateConcentration } from './concentration.ts';
import { calculateDcf, type ValuationAssumptions } from './dcf.ts';

export type RiskDiagnostic = {
  title: string;
  severity: 'watch' | 'material' | 'critical';
  message: string;
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const money = (value: number) => `$${(value / 1_000_000).toFixed(1)}M`;

export function breakTheDeal(
  assumptions: ValuationAssumptions,
  demandShares: number[],
): RiskDiagnostic[] {
  const current = calculateDcf(assumptions);
  const higherDiscount = calculateDcf({
    ...assumptions,
    discountRate: assumptions.discountRate + 0.02,
  });
  const weakerMaturity = calculateDcf({
    ...assumptions,
    matureGrowthRate: assumptions.matureGrowthRate - 0.015,
  });
  const concentration = calculateConcentration(demandShares);
  const verifiedInterest = current.effectiveRightsShare;

  return [
    {
      title: 'Terminal dependence',
      severity:
        current.terminalValueShare > 0.6
          ? 'critical'
          : current.terminalValueShare > 0.45
            ? 'material'
            : 'watch',
      message: `${percent(current.terminalValueShare)} of value depends on cash flows beyond the explicit forecast.`,
    },
    {
      title: 'Discount-rate sensitivity',
      severity: 'material',
      message: `A 200 bps increase removes ${money(current.catalogValue - higherDiscount.catalogValue)} (${percent(1 - higherDiscount.catalogValue / current.catalogValue)}) of value.`,
    },
    {
      title: 'Mature-catalog decay',
      severity: 'material',
      message: `Adding 1.5 points of annual mature-period decay removes ${money(current.catalogValue - weakerMaturity.catalogValue)} of value.`,
    },
    {
      title: 'Demand concentration',
      severity:
        concentration.label === 'High'
          ? 'critical'
          : concentration.label === 'Moderate'
            ? 'material'
            : 'watch',
      message: `The top five tracks represent ${percent(concentration.topFiveShare)} of modeled demand; the concentration indicator is ${concentration.label.toLowerCase()}.`,
    },
    {
      title: 'Rights verification',
      severity: 'critical',
      message: `${percent(verifiedInterest)} effective economic participation is modeled, but the ownership inputs are assumptions—not verified contracts.`,
    },
  ];
}
