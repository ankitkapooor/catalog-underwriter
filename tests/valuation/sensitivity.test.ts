import assert from 'node:assert/strict';
import test from 'node:test';

import { buildSensitivityMatrix } from '../../lib/valuation/sensitivity.ts';
import type { ValuationAssumptions } from '../../lib/valuation/dcf.ts';

const assumptions: ValuationAssumptions = {
  normalizedCashFlow: 1_000_000,
  nearTermGrowthRate: -0.01,
  matureGrowthRate: -0.02,
  discountRate: 0.1,
  terminalGrowthRate: -0.01,
  masterRightsShare: 1,
  publishingRightsShare: 1,
  songwriterEconomicInterest: 1,
  masterRevenueMix: 0.7,
  adminFeeRate: 0.05,
  syncUpliftRate: 0,
  concentrationPremium: 0,
  forecastYears: 10,
};

test('sensitivity matrix returns every requested rate pair', () => {
  const matrix = buildSensitivityMatrix(
    assumptions,
    [0.09, 0.1],
    [-0.02, -0.01, 0],
  );
  assert.equal(matrix.length, 2);
  assert.equal(matrix[0].length, 3);
});

test('value falls as the discount rate rises', () => {
  const matrix = buildSensitivityMatrix(assumptions, [0.09, 0.12], [-0.01]);
  assert.ok((matrix[0][0].value ?? 0) > (matrix[1][0].value ?? 0));
});
