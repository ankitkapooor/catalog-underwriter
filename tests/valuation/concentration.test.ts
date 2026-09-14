import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateConcentration } from '../../lib/valuation/concentration.ts';

test('concentration normalizes observed demand shares', () => {
  const result = calculateConcentration([40, 20, 10, 10, 5, 5, 3, 3, 2, 1, 1]);
  assert.equal(result.topOneShare, 0.4);
  assert.ok(Math.abs(result.topFiveShare - 0.85) < 0.000001);
  assert.ok(Math.abs(result.topTenShare - 0.99) < 0.000001);
  assert.ok(Math.abs(result.longTailShare - 0.01) < 0.000001);
  assert.equal(result.label, 'High');
});

test('missing demand remains zero rather than fabricated', () => {
  assert.deepEqual(calculateConcentration([]), {
    topOneShare: 0,
    topFiveShare: 0,
    topTenShare: 0,
    longTailShare: 1,
    hhi: 0,
    label: 'Low',
  });
});
