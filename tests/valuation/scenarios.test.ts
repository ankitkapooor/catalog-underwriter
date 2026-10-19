import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultValuationAssumptions } from '../../config/valuation-defaults.ts';
import { calculateScenarios } from '../../lib/valuation/scenarios.ts';

test('bear, base, and bull cases order value conservatively', () => {
  const result = calculateScenarios(defaultValuationAssumptions);
  assert.ok(result.bear.catalogValue < result.base.catalogValue);
  assert.ok(result.base.catalogValue < result.bull.catalogValue);
});

test('default cases value cash flow at market-consistent multiples', () => {
  const result = calculateScenarios(defaultValuationAssumptions);
  const multiple = (scenario: keyof typeof result) =>
    result[scenario].catalogValue /
    defaultValuationAssumptions.normalizedCashFlow;

  // Citrin Cooperman put older catalogs at 16.7–17.6× in 2024.
  assert.ok(multiple('base') > 16 && multiple('base') < 18.5);
  // Shot Tower's 9.63% re-valuation, with the 10% rights haircut.
  assert.ok(multiple('bear') > 9.5 && multiple('bear') < 12);
  // The 2021–22 peak range for iconic catalogs.
  assert.ok(multiple('bull') > 20 && multiple('bull') < 26);
});
