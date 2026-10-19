import type { ValuationAssumptions } from '@/lib/valuation/dcf';

export const METHODOLOGY_VERSION = 'public-underwrite-1.2.0';
export const VALUATION_ENGINE_VERSION = 'dcf-1.0.0';
export const PROVIDER_VERSION = 'public-providers-1.0.0';

/**
 * Defaults are anchored to how the catalog market prices income, not fitted
 * to individual deals. The base case values cash flow at about 17×, in line
 * with Citrin Cooperman's 2024 multiples for older catalogs (16.7–17.6×):
 * - 8.5% discount rate: Citrin Cooperman's rate for the Hipgnosis Songs Fund
 *   valuations, 2020–2023.
 * - +5% a year for years 1–5: IFPI recorded-music revenue grew 4.8% in 2024
 *   and 6.4% in 2025.
 * - +2% mature and terminal growth: roughly long-run inflation.
 */
export const defaultValuationAssumptions: ValuationAssumptions = {
  normalizedCashFlow: 6_200_000,
  nearTermGrowthRate: 0.05,
  matureGrowthRate: 0.02,
  discountRate: 0.085,
  terminalGrowthRate: 0.02,
  masterRightsShare: 1,
  publishingRightsShare: 1,
  songwriterEconomicInterest: 1,
  masterRevenueMix: 0.72,
  adminFeeRate: 0.05,
  syncUpliftRate: 0.02,
  concentrationPremium: 0,
  forecastYears: 10,
};

/**
 * Bear (about 10.6× with the rights haircut): Shot Tower's 9.63% weighted
 * discount rate from its 2024 Hipgnosis re-valuation, with slower growth.
 * Bull (about 23.6×): the 2021–22 peak, when iconic catalogs traded around
 * 19–25× (Shot Tower's 19.4× 2022 average; Billboard's 25–30× publishing
 * range for Springsteen).
 */
export const scenarioAdjustments = {
  bear: {
    nearTermGrowthRate: 0.02,
    matureGrowthRate: 0.01,
    discountRate: 0.096,
    terminalGrowthRate: 0.01,
    rightsHaircut: 0.1,
  },
  base: {
    nearTermGrowthRate: defaultValuationAssumptions.nearTermGrowthRate,
    matureGrowthRate: defaultValuationAssumptions.matureGrowthRate,
    discountRate: defaultValuationAssumptions.discountRate,
    terminalGrowthRate: defaultValuationAssumptions.terminalGrowthRate,
    rightsHaircut: 0,
  },
  bull: {
    nearTermGrowthRate: 0.06,
    matureGrowthRate: 0.03,
    discountRate: 0.075,
    terminalGrowthRate: 0.025,
    rightsHaircut: 0,
  },
} as const;
