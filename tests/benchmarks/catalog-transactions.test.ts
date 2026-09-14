import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

import { assessTransactionBenchmark } from '../../lib/valuation/transaction-benchmarks.ts';

type Transaction = {
  artist: string;
  reportedValue: number | null;
  rightsIncluded: string[];
};

test('curated transactions include the reported Taylor first-six-masters benchmark', async () => {
  const data = JSON.parse(
    await readFile(
      new URL('../../data/catalog-transactions.json', import.meta.url),
      'utf8',
    ),
  ) as Transaction[];
  const taylor = data.find((item) =>
    item.artist.includes('Taylor Swift (first six Big Machine albums)'),
  );

  assert.ok(taylor);
  assert.equal(taylor.reportedValue, 360_000_000);
  assert.ok(taylor.rightsIncluded.includes('masters'));
});

test('an unsupported automatic Taylor valuation is rejected before comparison', () => {
  assert.deepEqual(
    assessTransactionBenchmark({
      reportedValue: 360_000_000,
      candidateValue: 20_000_000,
      cashFlowSource: 'automatic-public-evidence',
      hasAnnualConsumptionEvidence: false,
    }),
    {
      status: 'unsupported',
      ratio: null,
      reason:
        'Automatic valuation is unsupported without annual-consumption evidence.',
    },
  );
});

test('a $20M candidate against a $360M transaction fails sanity validation', () => {
  const assessment = assessTransactionBenchmark({
    reportedValue: 360_000_000,
    candidateValue: 20_000_000,
    cashFlowSource: 'verified-financials',
    hasAnnualConsumptionEvidence: true,
  });

  assert.equal(assessment.status, 'fail');
  assert.ok((assessment.ratio ?? 1) < 0.1);
});
