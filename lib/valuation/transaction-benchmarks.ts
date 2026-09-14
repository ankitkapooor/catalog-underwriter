import { benchmarkValidation } from '../../config/benchmark-validation.ts';

export type BenchmarkCandidate = {
  reportedValue: number;
  candidateValue: number | null;
  cashFlowSource:
    | 'verified-financials'
    | 'user-entered-cash-flow'
    | 'automatic-public-evidence';
  hasAnnualConsumptionEvidence: boolean;
};

export type BenchmarkAssessment = {
  status: 'pass' | 'fail' | 'unsupported' | 'unavailable';
  ratio: number | null;
  reason: string;
};

export function assessTransactionBenchmark(
  candidate: BenchmarkCandidate,
): BenchmarkAssessment {
  if (
    !Number.isFinite(candidate.reportedValue) ||
    candidate.reportedValue <= 0 ||
    candidate.candidateValue == null ||
    !Number.isFinite(candidate.candidateValue) ||
    candidate.candidateValue < 0
  ) {
    return {
      status: 'unavailable',
      ratio: null,
      reason: 'Both a reported value and a candidate valuation are required.',
    };
  }

  if (
    candidate.cashFlowSource === 'automatic-public-evidence' &&
    !candidate.hasAnnualConsumptionEvidence
  ) {
    return {
      status: 'unsupported',
      ratio: null,
      reason:
        'Automatic valuation is unsupported without annual-consumption evidence.',
    };
  }

  const ratio = candidate.candidateValue / candidate.reportedValue;
  const status =
    ratio >= benchmarkValidation.minimumReportedValueRatio &&
    ratio <= benchmarkValidation.maximumReportedValueRatio
      ? 'pass'
      : 'fail';
  return {
    status,
    ratio,
    reason:
      status === 'pass'
        ? 'Candidate value falls within the broad benchmark sanity band.'
        : 'Candidate value is outside the broad benchmark sanity band and requires review.',
  };
}
