import { PUBLIC_CASH_FLOW_AUTOMATION_ENABLED } from '../../config/public-cash-flow-model.ts';
import type { PublicCashFlowEstimate } from '../../types/catalog.ts';

export type PublicCashFlowEvidence = {
  topTracks: Array<{
    name: string;
    playcount: number;
    listeners: number;
    sourceUrl?: string;
  }>;
  releaseCount: number;
  weightedCatalogAge: number | null;
  activeCareerYears: number | null;
  retrievedAt: string;
};

/**
 * Legacy compatibility guard. Public demand and catalog metadata cannot
 * directly generate dollar cash flow, so production and test callers always
 * receive null. Keep the signature temporarily while downstream callers move
 * to PublicConsumptionEstimate and RightsEconomics.
 */
export function estimatePublicCashFlow(
  _evidence: PublicCashFlowEvidence,
): PublicCashFlowEstimate | null {
  if (PUBLIC_CASH_FLOW_AUTOMATION_ENABLED) {
    throw new Error(
      'Public cash-flow automation cannot be enabled without an evidence-backed replacement model.',
    );
  }
  return null;
}
