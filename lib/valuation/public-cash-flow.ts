import {
  MODELED_CASH_FLOW_NOTE,
  PUBLIC_CASH_FLOW_METHODOLOGY_VERSION,
} from '../../config/public-cash-flow-model.ts';
import type {
  ModelInput,
  PublicCashFlowEstimate,
  PublicConsumptionEstimate,
} from '../../types/catalog.ts';
import {
  estimateRightsRevenue,
  type RightsEconomicsAssumptions,
} from './rights-economics.ts';

const perThousand = (value: number | null) =>
  value == null ? 'Blank' : `$${value.toFixed(2)} per 1,000`;
const share = (value: number | null) =>
  value == null ? 'Blank' : `${(value * 100).toFixed(0)}% of recorded`;

/**
 * Builds the modeled annual cash-flow range from annual consumption and the
 * low, base and high rights economics. Any missing input returns null so a
 * blank assumption never turns into an implied payout.
 */
export function buildModeledCashFlowEstimate(
  consumption: PublicConsumptionEstimate | null,
  economics: RightsEconomicsAssumptions,
): PublicCashFlowEstimate | null {
  if (!consumption) return null;
  const low = estimateRightsRevenue(consumption, economics, 'low');
  const base = estimateRightsRevenue(consumption, economics, 'base');
  const high = estimateRightsRevenue(consumption, economics, 'high');
  if (!low || !base || !high) return null;

  const revenues = [low, base, high].map(
    (estimate) => estimate.normalizedAnnualRightsRevenue,
  );
  const inputs: ModelInput[] = [
    ...consumption.inputs.filter(
      (input) => input.layer === 'modeled-consumption',
    ),
    {
      label: 'Audio rights revenue (base)',
      value: perThousand(economics.base.audioEffectiveRightsRevenuePerThousand),
      method: 'assumption',
      layer: 'economic-assumption',
    },
    {
      label: 'YouTube rights revenue (base)',
      value: perThousand(
        economics.base.youtubeEffectiveRightsRevenuePerThousand,
      ),
      method: 'assumption',
      layer: 'economic-assumption',
    },
    {
      label: 'Publishing revenue (base)',
      value: share(economics.base.publishingRevenueAsShareOfRecorded),
      method: 'assumption',
      layer: 'economic-assumption',
    },
    {
      label: 'Other revenue (base)',
      value: share(economics.base.otherRevenueAsShareOfRecorded),
      method: 'assumption',
      layer: 'economic-assumption',
    },
  ];

  // Other revenue (physical, downloads, neighbouring rights) belongs to the
  // recordings, so only the publishing line counts against the master share.
  const masterRevenueMix =
    base.normalizedAnnualRightsRevenue > 0
      ? (base.normalizedAnnualRightsRevenue - base.publishing) /
        base.normalizedAnnualRightsRevenue
      : undefined;

  return {
    // Edited assumptions can cross scenarios, so the range is widened to
    // contain every scenario while the midpoint stays on the base case.
    low: Math.min(...revenues),
    midpoint: base.normalizedAnnualRightsRevenue,
    high: Math.max(...revenues),
    masterRevenueMix,
    confidence: 'low',
    methodologyVersion: PUBLIC_CASH_FLOW_METHODOLOGY_VERSION,
    inputs,
    note: MODELED_CASH_FLOW_NOTE,
    retrievedAt: consumption.retrievedAt,
  };
}
