import type { PublicConsumptionEstimate } from '../../types/catalog.ts';

export type EconomicsScenario = 'low' | 'base' | 'high';

export type RightsEconomicsScenarioAssumptions = {
  audioEffectiveRightsRevenuePerThousand: number | null;
  youtubeEffectiveRightsRevenuePerThousand: number | null;
  publishingRevenueAsShareOfRecorded: number | null;
  otherRevenueAsShareOfRecorded: number | null;
};

export type RightsEconomicsAssumptions = Record<
  EconomicsScenario,
  RightsEconomicsScenarioAssumptions
>;

export type RightsRevenueEstimate = {
  scenario: EconomicsScenario;
  audioStreaming: number;
  youtube: number;
  publishing: number;
  other: number;
  normalizedAnnualRightsRevenue: number;
  methodologyVersion: string;
};

const rangeValue = (
  range: { low: number; midpoint: number; high: number },
  scenario: EconomicsScenario,
) => (scenario === 'base' ? range.midpoint : range[scenario]);

const validNonnegative = (value: number | null): value is number =>
  value != null && Number.isFinite(value) && value >= 0;

export function estimateRightsRevenue(
  consumption: PublicConsumptionEstimate | null,
  assumptions: RightsEconomicsAssumptions,
  scenario: EconomicsScenario,
  methodologyVersion = 'rights-economics-1.0.0',
): RightsRevenueEstimate | null {
  if (
    !consumption ||
    (!consumption.audioStreamingEquivalent && !consumption.youtubeAnnualViews)
  ) {
    return null;
  }

  const selected = assumptions[scenario];
  if (
    !validNonnegative(selected.audioEffectiveRightsRevenuePerThousand) ||
    !validNonnegative(selected.youtubeEffectiveRightsRevenuePerThousand) ||
    !validNonnegative(selected.publishingRevenueAsShareOfRecorded) ||
    !validNonnegative(selected.otherRevenueAsShareOfRecorded)
  ) {
    return null;
  }

  const audioStreaming = consumption.audioStreamingEquivalent
    ? (rangeValue(consumption.audioStreamingEquivalent, scenario) / 1_000) *
      selected.audioEffectiveRightsRevenuePerThousand
    : 0;
  const youtube = consumption.youtubeAnnualViews
    ? (rangeValue(consumption.youtubeAnnualViews, scenario) / 1_000) *
      selected.youtubeEffectiveRightsRevenuePerThousand
    : 0;
  const recorded = audioStreaming + youtube;
  const publishing = recorded * selected.publishingRevenueAsShareOfRecorded;
  const other = recorded * selected.otherRevenueAsShareOfRecorded;

  return {
    scenario,
    audioStreaming,
    youtube,
    publishing,
    other,
    normalizedAnnualRightsRevenue:
      audioStreaming + youtube + publishing + other,
    methodologyVersion,
  };
}
