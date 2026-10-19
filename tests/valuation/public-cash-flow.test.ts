import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultRightsEconomicsAssumptions } from '../../config/rights-economics.ts';
import { buildModeledCashFlowEstimate } from '../../lib/valuation/public-cash-flow.ts';
import type { PublicConsumptionEstimate } from '../../types/catalog.ts';

const consumption: PublicConsumptionEstimate = {
  audioStreamingEquivalent: {
    low: 1_000_000_000,
    midpoint: 1_500_000_000,
    high: 2_000_000_000,
  },
  youtubeAnnualViews: {
    low: 100_000_000,
    midpoint: 200_000_000,
    high: 300_000_000,
  },
  confidence: 'low',
  inputs: [],
  methodologyVersion: 'test-consumption',
  retrievedAt: '2026-10-18T00:00:00.000Z',
  note: 'Test fixture',
};

test('cumulative-only evidence still produces no cash flow', () => {
  assert.equal(
    buildModeledCashFlowEstimate(
      {
        ...consumption,
        audioStreamingEquivalent: null,
        youtubeAnnualViews: null,
      },
      defaultRightsEconomicsAssumptions,
    ),
    null,
  );
  assert.equal(
    buildModeledCashFlowEstimate(null, defaultRightsEconomicsAssumptions),
    null,
  );
});

test('annual consumption × default economics gives an ordered modeled range', () => {
  const estimate = buildModeledCashFlowEstimate(
    consumption,
    defaultRightsEconomicsAssumptions,
  );

  assert.ok(estimate);
  // Base: (1.5B / 1k × $3.20 + 200M / 1k × $0.80) × (1 + 0.28 + 0.25).
  assert.equal(Math.round(estimate.midpoint), 7_588_800);
  assert.ok(estimate.low < estimate.midpoint);
  assert.ok(estimate.midpoint < estimate.high);
  assert.equal(estimate.confidence, 'low');
  assert.match(estimate.note, /Modeled from public demand/);
  assert.match(estimate.note, /not a royalty statement/);
});

test('the estimate records how much revenue the recordings earn', () => {
  const estimate = buildModeledCashFlowEstimate(
    consumption,
    defaultRightsEconomicsAssumptions,
  );

  assert.ok(estimate?.masterRevenueMix);
  // Recordings earn streaming plus other revenue; publishing is the rest:
  // (1 + 0.25) / (1 + 0.28 + 0.25).
  assert.ok(Math.abs(estimate.masterRevenueMix - 1.25 / 1.53) < 1e-9);
});

test('blanking any base assumption turns the modeled estimate off', () => {
  const estimate = buildModeledCashFlowEstimate(consumption, {
    ...defaultRightsEconomicsAssumptions,
    base: {
      ...defaultRightsEconomicsAssumptions.base,
      audioEffectiveRightsRevenuePerThousand: null,
    },
  });

  assert.equal(estimate, null);
});

test('edited scenarios that cross keep the base midpoint inside the range', () => {
  const estimate = buildModeledCashFlowEstimate(consumption, {
    ...defaultRightsEconomicsAssumptions,
    low: {
      ...defaultRightsEconomicsAssumptions.low,
      audioEffectiveRightsRevenuePerThousand: 10,
    },
  });

  assert.ok(estimate);
  assert.ok(estimate.low <= estimate.midpoint);
  assert.ok(estimate.midpoint <= estimate.high);
});
