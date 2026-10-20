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
    /no dollar\s+estimate\s+is\s+fabricated\s+from\s+cumulative\s+API\s+metrics/,
  );
});

test('live lookups lead with the API evidence instead of an unavailable valuation', async () => {
  const source = await workbenchSource();

  assert.match(source, /Public API evidence loaded/);
  assert.match(source, /MusicBrainz release groups/);
  assert.match(source, /Last\.fm top tracks/);
  assert.match(source, /matched YouTube uploads/);
  // The page opens on the valuation terms, with the evidence banner above.
  assert.match(source, /<Tabs defaultValue="terms"/);
});

test('back-to-search controls use hard navigation', async () => {
  const source = await workbenchSource();
  const hardNavigationLinks = source.match(/data-hard-navigation="true"/g);

  assert.equal(hardNavigationLinks?.length, 2);
  assert.match(source, /window\.location\.assign\('\/'\)/);
  assert.doesNotMatch(source, /<Link[\s\S]{0,160}aria-label="Back to search"/);
});

test('known or hypothetical cash flow can always override the modeled estimate', async () => {
  const source = await workbenchSource();

  assert.match(source, /Where the annual cash flow comes from/);
  assert.match(source, /Known figure/);
  assert.match(source, /disabled=\{usingModeledCashFlow\}/);
  // A blank term stays unknown rather than becoming zero.
  const term = await readFile(
    new URL('../../components/underwrite/term.tsx', import.meta.url),
    'utf8',
  );
  assert.match(term, /event\.target\.value === ''\s*\? Number\.NaN/);
});

test('a modeled cash flow is labeled wherever it drives the valuation', async () => {
  const source = await workbenchSource();

  assert.match(source, /'Modeled cash flow'/);
  assert.match(source, /'On modeled cash flow'/);
  assert.match(source, /modeled annual cash flow of/);
  assert.match(source, /buildModeledCashFlowEstimate\(/);
});

test('the live artist route models cash flow only from annualized consumption', async () => {
  const source = await readFile(
    new URL('../../app/api/artists/[id]/route.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /modelPublicEconomics\(/);
  assert.match(source, /lastFmTracks: lastFmSignals/);
  assert.match(source, /defaultRightsEconomicsAssumptions/);
  assert.match(
    source,
    /catalog\.publicCashFlowEstimate = publicCashFlowEstimate/,
  );
});

test('the homepage values the stored demo with its modeled cash flow', async () => {
  const source = await readFile(
    new URL('../../app/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(source, /normalizedCashFlow: demoCashFlow\.midpoint/);
  assert.match(source, /evidence \{evidenceDate\}/);
  assert.doesNotMatch(
    source,
    /calculateScenarios\(defaultValuationAssumptions\)/,
  );
});

test('the market approach and DCF value the same rights-weighted interest', async () => {
  const source = await workbenchSource();

  assert.match(
    source,
    /economicCashFlow =\s*assumptions\.normalizedCashFlow \* calculateEconomicRightsShare\(assumptions\)/,
  );
  assert.match(
    source,
    /calculateMarketMultipleValue\(economicCashFlow, selectedMarketMultiple\)/,
  );
  assert.match(
    source,
    /reconcileValuations\(active\.catalogValue, economicCashFlow, marketRange\)/,
  );
  assert.match(
    source,
    /masterRevenueMix:\s*cashFlowEstimate\.masterRevenueMix \?\?/,
  );
});
