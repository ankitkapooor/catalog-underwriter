import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const workbenchSource = () =>
  readFile(
    new URL('../../components/underwriting-workbench.tsx', import.meta.url),
    'utf8',
  );

test('the workbench does not silently substitute the former $1M fallback', async () => {
  const source = await workbenchSource();

  assert.doesNotMatch(
    source,
    /publicCashFlowEstimate\?\.midpoint\s*\?\?\s*1_000_000/,
  );
  assert.match(source, /normalizedCashFlow:[\s\S]*Number\.NaN/);
  assert.match(
    source,
    /Automatic economic cash-flow estimate not yet available from[\s\S]*sufficient public evidence\./,
  );
});

test('known or hypothetical cash flow remains an explicit user input', async () => {
  const source = await workbenchSource();

  assert.match(source, /Use my own normalized annual cash flow/);
  assert.match(source, /disabled=\{!useKnownCashFlow\}/);
  assert.match(source, /event\.target\.value === ''\s*\? Number\.NaN/);
});

test('the stored Kendrick demonstration range is an explicit analyst assumption', async () => {
  const source = await readFile(
    new URL('../../data/demo-catalog.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /low: 4_800_000/);
  assert.match(source, /midpoint: 6_200_000/);
  assert.match(source, /high: 7_100_000/);
  assert.match(source, /methodologyVersion: 'public-underwrite-1\.0\.0'/);
  assert.match(source, /Stored analyst scenario/);
  assert.match(source, /Not derived from Last\.fm or MusicBrainz/);
});

test('the live artist route never invokes the legacy public cash-flow estimator', async () => {
  const source = await readFile(
    new URL('../../app/api/artists/[id]/route.ts', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(source, /estimatePublicCashFlow/);
  assert.match(source, /catalog\.publicCashFlowEstimate = null/);
});
