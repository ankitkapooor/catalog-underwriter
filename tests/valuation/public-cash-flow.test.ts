import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimatePublicCashFlow } from '../../lib/valuation/public-cash-flow.ts';

test('Last.fm demand alone cannot generate dollar cash flow', () => {
  const estimate = estimatePublicCashFlow({
    topTracks: Array.from({ length: 25 }, (_, index) => ({
      name: `Track ${index + 1}`,
      playcount: 1_000_000_000,
      listeners: 100_000_000,
      sourceUrl: 'https://www.last.fm/',
    })),
    releaseCount: 100,
    weightedCatalogAge: 10,
    activeCareerYears: 15,
    retrievedAt: '2026-09-15T00:00:00.000Z',
  });

  assert.equal(estimate, null);
});
