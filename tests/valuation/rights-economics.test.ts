import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultRightsEconomicsAssumptions } from '../../config/rights-economics.ts';
import { estimateRightsRevenue } from '../../lib/valuation/rights-economics.ts';
import type { PublicConsumptionEstimate } from '../../types/catalog.ts';

const annualConsumption: PublicConsumptionEstimate = {
  audioStreamingEquivalent: {
    low: 800_000,
    midpoint: 1_000_000,
    high: 1_300_000,
  },
  youtubeAnnualViews: {
    low: 400_000,
    midpoint: 500_000,
    high: 700_000,
  },
  confidence: 'medium',
  inputs: [],
  methodologyVersion: 'test-consumption',
  retrievedAt: '2026-09-15T00:00:00.000Z',
  note: 'Test fixture',
};

const blankScenario = {
  audioEffectiveRightsRevenuePerThousand: null,
  youtubeEffectiveRightsRevenuePerThousand: null,
  publishingRevenueAsShareOfRecorded: null,
  otherRevenueAsShareOfRecorded: null,
};

test('missing annual evidence or economic assumptions does not create revenue', () => {
  assert.equal(
    estimateRightsRevenue(null, defaultRightsEconomicsAssumptions, 'base'),
    null,
  );
  assert.equal(
    estimateRightsRevenue(
      annualConsumption,
      { low: blankScenario, base: blankScenario, high: blankScenario },
      'base',
    ),
    null,
  );
});

test('default economics are complete and ordered from low to high', () => {
  const { low, base, high } = defaultRightsEconomicsAssumptions;
  for (const key of Object.keys(base) as Array<keyof typeof base>) {
    const values = [low[key], base[key], high[key]];
    assert.ok(
      values.every((value) => value != null && value >= 0),
      `${key} must have a default in every scenario`,
    );
    assert.ok(
      (values[0] ?? 0) <= (values[1] ?? 0) &&
        (values[1] ?? 0) <= (values[2] ?? 0),
      `${key} must not decrease from low to high`,
    );
  }
  assert.ok(
    estimateRightsRevenue(
      annualConsumption,
      defaultRightsEconomicsAssumptions,
      'base',
    ),
  );
});

test('rights economics calculates audio, YouTube, publishing, and other separately', () => {
  const base = {
    audioEffectiveRightsRevenuePerThousand: 4,
    youtubeEffectiveRightsRevenuePerThousand: 1,
    publishingRevenueAsShareOfRecorded: 0.2,
    otherRevenueAsShareOfRecorded: 0.1,
  };
  const estimate = estimateRightsRevenue(
    annualConsumption,
    { low: base, base, high: base },
    'base',
  );

  assert.deepEqual(estimate, {
    scenario: 'base',
    audioStreaming: 4_000,
    youtube: 500,
    publishing: 900,
    other: 450,
    normalizedAnnualRightsRevenue: 5_850,
    methodologyVersion: 'rights-economics-1.0.0',
  });
});
