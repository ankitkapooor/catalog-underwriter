import type { ValuationAssumptions } from '@/lib/valuation/dcf';

export const METHODOLOGY_VERSION = 'public-underwrite-1.0.0';
export const VALUATION_ENGINE_VERSION = 'dcf-1.0.0';
export const PROVIDER_VERSION = 'public-providers-1.0.0';

export const defaultValuationAssumptions: ValuationAssumptions = {
  normalizedCashFlow: 6_200_000,
  nearTermGrowthRate: -0.005,
  matureGrowthRate: -0.015,
  discountRate: 0.105,
  terminalGrowthRate: -0.01,
  masterRightsShare: 1,
  publishingRightsShare: 1,
  songwriterEconomicInterest: 1,
  masterRevenueMix: 0.72,
  adminFeeRate: 0.05,
  syncUpliftRate: 0.02,
  concentrationPremium: 0,
  forecastYears: 10,
};

export const scenarioAdjustments = {
  bear: {
    nearTermGrowthRate: -0.04,
    matureGrowthRate: -0.04,
    discountRate: 0.13,
    terminalGrowthRate: -0.03,
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
    nearTermGrowthRate: 0.025,
    matureGrowthRate: 0,
    discountRate: 0.085,
    terminalGrowthRate: 0.005,
    rightsHaircut: 0,
  },
} as const;
