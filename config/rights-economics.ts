import type { RightsEconomicsAssumptions } from '../lib/valuation/rights-economics.ts';

export const RIGHTS_ECONOMICS_VERSION = 'rights-economics-1.0.0';

const emptyScenario = () => ({
  audioEffectiveRightsRevenuePerThousand: null,
  youtubeEffectiveRightsRevenuePerThousand: null,
  publishingRevenueAsShareOfRecorded: null,
  otherRevenueAsShareOfRecorded: null,
});

/**
 * Values are deliberately blank. They depend on territory, platform mix,
 * rights ownership, deal terms, and deductions, so the user must supply them.
 */
export const defaultRightsEconomicsAssumptions: RightsEconomicsAssumptions = {
  low: emptyScenario(),
  base: emptyScenario(),
  high: emptyScenario(),
};
