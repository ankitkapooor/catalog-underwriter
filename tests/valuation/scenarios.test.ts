import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultValuationAssumptions } from '../../config/valuation-defaults.ts';
import { calculateScenarios } from '../../lib/valuation/scenarios.ts';

test('bear, base, and bull cases order value conservatively', () => {
  const result = calculateScenarios(defaultValuationAssumptions);
  assert.ok(result.bear.catalogValue < result.base.catalogValue);
  assert.ok(result.base.catalogValue < result.bull.catalogValue);
});
