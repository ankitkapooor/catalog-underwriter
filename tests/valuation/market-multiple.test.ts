import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  calculateMarketMultipleValue,
  deriveMarketMultipleRange,
  reconcileValuations,
} from '../../lib/valuation/market-multiple.ts';

const observations = [
  { marketCategory: 'publishing' as const, reportedMultiple: 12.75 },
  { marketCategory: 'publishing' as const, reportedMultiple: 14.76 },
  { marketCategory: 'publishing' as const, reportedMultiple: 18.3 },
  { marketCategory: 'younger-masters' as const, reportedMultiple: null },
];

test('market multiple range is derived from curated observations', () => {
  assert.deepEqual(deriveMarketMultipleRange(observations, 'publishing'), {
    low: 12.75,
    midpoint: 14.76,
    high: 18.3,
    sampleSize: 3,
    basis: 'category transactions',
  });
});

test('market multiple valuation uses the user-selected multiple', () => {
  assert.equal(calculateMarketMultipleValue(1_000_000, 14.76), 14_760_000);
});

test('reconciliation spans DCF and market band without averaging', () => {
  const range = deriveMarketMultipleRange(observations, 'publishing');
  assert.ok(range);
  assert.deepEqual(reconcileValuations(10_000_000, 1_000_000, range), {
    low: 10_000_000,
    high: 18_300_000,
    method:
      'The indicative range spans the selected DCF result and the transaction-derived market-multiple band. It is not a mechanical average.',
  });
});
