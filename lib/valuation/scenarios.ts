import { scenarioAdjustments } from '../../config/valuation-defaults.ts';

import {
  calculateDcf,
  type DcfResult,
  type ValuationAssumptions,
} from './dcf.ts';

export type ScenarioName = 'bear' | 'base' | 'bull';

export function assumptionsForScenario(
  base: ValuationAssumptions,
  scenario: ScenarioName,
): ValuationAssumptions {
  const adjustment = scenarioAdjustments[scenario];
  const rightsFactor = 1 - adjustment.rightsHaircut;

  return {
    ...base,
    nearTermGrowthRate: adjustment.nearTermGrowthRate,
    matureGrowthRate: adjustment.matureGrowthRate,
    discountRate: adjustment.discountRate,
    terminalGrowthRate: adjustment.terminalGrowthRate,
    masterRightsShare: base.masterRightsShare * rightsFactor,
    publishingRightsShare: base.publishingRightsShare * rightsFactor,
  };
}

export function calculateScenarios(
  base: ValuationAssumptions,
): Record<ScenarioName, DcfResult> {
  return {
    bear: calculateDcf(assumptionsForScenario(base, 'bear')),
    base: calculateDcf(base),
    bull: calculateDcf(assumptionsForScenario(base, 'bull')),
  };
}
