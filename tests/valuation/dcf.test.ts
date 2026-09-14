import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateDcf,
  calculateEconomicRightsShare,
  type ValuationAssumptions,
} from '../../lib/valuation/dcf.ts';

const fixture: ValuationAssumptions = {
  normalizedCashFlow: 100,
  nearTermGrowthRate: 0,
  matureGrowthRate: 0,
  discountRate: 0.1,
  terminalGrowthRate: 0,
  masterRightsShare: 1,
  publishingRightsShare: 1,
  songwriterEconomicInterest: 1,
  masterRevenueMix: 0.75,
  adminFeeRate: 0,
  syncUpliftRate: 0,
  concentrationPremium: 0,
  forecastYears: 10,
};

test('zero-growth perpetuity equals cash flow divided by discount rate', () => {
  const result = calculateDcf(fixture);
  assert.ok(Math.abs(result.catalogValue - 1_000) < 0.000001);
  assert.ok(Math.abs(result.impliedMultiple - 10) < 0.000001);
});

test('rights weighting separates master and publishing economics', () => {
  const share = calculateEconomicRightsShare({
    ...fixture,
    masterRightsShare: 0.8,
    publishingRightsShare: 0.5,
    songwriterEconomicInterest: 0.5,
    adminFeeRate: 0.1,
  });
  assert.ok(Math.abs(share - 0.59625) < 0.000001);
});

test('terminal growth must stay below the effective discount rate', () => {
  assert.throws(
    () =>
      calculateDcf({
        ...fixture,
        discountRate: 0.03,
        terminalGrowthRate: 0.03,
      }),
    /Terminal growth must be below/,
  );
});

test('a higher discount rate lowers present value', () => {
  const lowRate = calculateDcf({ ...fixture, discountRate: 0.08 });
  const highRate = calculateDcf({ ...fixture, discountRate: 0.12 });
  assert.ok(lowRate.catalogValue > highRate.catalogValue);
});

test('negative cash flow is rejected', () => {
  assert.throws(
    () => calculateDcf({ ...fixture, normalizedCashFlow: -1 }),
    /zero or greater/,
  );
});
