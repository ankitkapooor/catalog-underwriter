import assert from 'node:assert/strict';
import { test } from 'node:test';

import { estimatePublicCashFlow } from '../../lib/valuation/public-cash-flow.ts';

const baseEvidence = {
  releaseCount: 12,
  weightedCatalogAge: 10,
  activeCareerYears: 10,
  retrievedAt: '2026-09-15T00:00:00.000Z',
  topTracks: [
    { name: 'One', playcount: 10_000_000, listeners: 500_000 },
    { name: 'Two', playcount: 7_500_000, listeners: 400_000 },
    { name: 'Three', playcount: 5_000_000, listeners: 300_000 },
  ],
};

test('returns no estimate when public-demand evidence is insufficient', () => {
  assert.equal(
    estimatePublicCashFlow({
      ...baseEvidence,
      topTracks: baseEvidence.topTracks.slice(0, 2),
    }),
    null,
  );
  assert.equal(
    estimatePublicCashFlow({
      ...baseEvidence,
      topTracks: baseEvidence.topTracks.map((track) => ({
        ...track,
        playcount: 1_000,
        listeners: 100,
      })),
    }),
    null,
  );
  assert.equal(
    estimatePublicCashFlow({ ...baseEvidence, releaseCount: 0 }),
    null,
  );
});

test('uses absolute public-demand scale rather than only track proportions', () => {
  const lowScale = estimatePublicCashFlow({
    ...baseEvidence,
    topTracks: baseEvidence.topTracks.map((track) => ({
      ...track,
      playcount: track.playcount / 10,
      listeners: track.listeners / 10,
    })),
  });
  const highScale = estimatePublicCashFlow({
    ...baseEvidence,
    topTracks: baseEvidence.topTracks.map((track) => ({
      ...track,
      playcount: track.playcount * 10,
      listeners: track.listeners * 10,
    })),
  });

  assert.ok(lowScale);
  assert.ok(highScale);
  assert.ok(highScale.midpoint > lowScale.midpoint * 2);
});

test('produces a bounded, ordered range with provenance and explicit inputs', () => {
  const estimate = estimatePublicCashFlow(baseEvidence);

  assert.ok(estimate);
  assert.ok(estimate.low <= estimate.midpoint);
  assert.ok(estimate.midpoint <= estimate.high);
  assert.ok(estimate.low >= 25_000);
  assert.ok(estimate.high <= 50_000_000);
  assert.equal(estimate.methodologyVersion, 'public-cash-flow-1.0.0');
  assert.equal(estimate.retrievedAt, baseEvidence.retrievedAt);
  assert.ok(estimate.inputs.some((input) => input.method === 'observed'));
  assert.match(estimate.note, /not royalty-bearing streams/i);
});

test('listener scale changes the estimate while preserving playcount evidence', () => {
  const lowerListeners = estimatePublicCashFlow({
    ...baseEvidence,
    topTracks: baseEvidence.topTracks.map((track) => ({
      ...track,
      listeners: track.listeners / 5,
    })),
  });
  const higherListeners = estimatePublicCashFlow(baseEvidence);

  assert.ok(lowerListeners);
  assert.ok(higherListeners);
  assert.ok(higherListeners.midpoint > lowerListeners.midpoint);
  assert.match(higherListeners.inputs[0]?.value ?? '', /22,500,000/);
});

test('concentrated demand widens the indicative range', () => {
  const diversified = estimatePublicCashFlow({
    ...baseEvidence,
    topTracks: Array.from({ length: 10 }, (_, index) => ({
      name: `Track ${index}`,
      playcount: 2_250_000,
      listeners: 250_000,
    })),
  });
  const concentrated = estimatePublicCashFlow({
    ...baseEvidence,
    topTracks: [
      { name: 'One', playcount: 20_250_000, listeners: 500_000 },
      { name: 'Two', playcount: 750_000, listeners: 300_000 },
      { name: 'Three', playcount: 750_000, listeners: 250_000 },
      { name: 'Four', playcount: 750_000, listeners: 200_000 },
    ],
  });

  assert.ok(diversified);
  assert.ok(concentrated);
  assert.ok(
    concentrated.high - concentrated.low > diversified.high - diversified.low,
  );
});
