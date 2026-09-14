export type MarketCategory =
  | 'younger-masters'
  | 'mature-masters'
  | 'publishing'
  | 'combined-masters-publishing';

export type MarketMultipleObservation = {
  marketCategory: MarketCategory;
  reportedMultiple: number | null;
};

export type MarketMultipleRange = {
  low: number;
  midpoint: number;
  high: number;
  sampleSize: number;
  basis: 'category transactions' | 'cross-category disclosed-income proxy';
};

export const MARKET_CATEGORY_LABELS: Record<MarketCategory, string> = {
  'younger-masters': 'Younger masters',
  'mature-masters': 'Mature masters',
  publishing: 'Publishing',
  'combined-masters-publishing': 'Masters + publishing',
};

const MIN_CATEGORY_OBSERVATIONS = 2;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

const validMultiple = (value: number | null): value is number =>
  value != null && Number.isFinite(value) && value > 0;

export function deriveMarketMultipleRange(
  observations: MarketMultipleObservation[],
  category: MarketCategory,
): MarketMultipleRange | null {
  const categoryMultiples = observations
    .filter((item) => item.marketCategory === category)
    .map((item) => item.reportedMultiple)
    .filter(validMultiple);
  const disclosedMultiples = observations
    .map((item) => item.reportedMultiple)
    .filter(validMultiple);
  const values =
    categoryMultiples.length >= MIN_CATEGORY_OBSERVATIONS
      ? categoryMultiples
      : disclosedMultiples;
  if (!values.length) return null;

  return {
    low: Math.min(...values),
    midpoint: median(values),
    high: Math.max(...values),
    sampleSize: values.length,
    basis:
      categoryMultiples.length >= MIN_CATEGORY_OBSERVATIONS
        ? 'category transactions'
        : 'cross-category disclosed-income proxy',
  };
}

export function calculateMarketMultipleValue(
  normalizedAnnualCashFlow: number,
  selectedMultiple: number,
) {
  if (
    !Number.isFinite(normalizedAnnualCashFlow) ||
    normalizedAnnualCashFlow < 0 ||
    !Number.isFinite(selectedMultiple) ||
    selectedMultiple <= 0
  ) {
    throw new Error('Cash flow and selected market multiple must be valid.');
  }
  return normalizedAnnualCashFlow * selectedMultiple;
}

export type ValuationReconciliation = {
  low: number;
  high: number;
  method: string;
};

export function reconcileValuations(
  dcfValue: number,
  normalizedAnnualCashFlow: number,
  marketRange: MarketMultipleRange,
): ValuationReconciliation {
  if (
    !Number.isFinite(dcfValue) ||
    dcfValue < 0 ||
    !Number.isFinite(normalizedAnnualCashFlow) ||
    normalizedAnnualCashFlow < 0
  ) {
    throw new Error('DCF value and cash flow must be valid.');
  }
  const marketLow = normalizedAnnualCashFlow * marketRange.low;
  const marketHigh = normalizedAnnualCashFlow * marketRange.high;
  return {
    low: Math.min(dcfValue, marketLow),
    high: Math.max(dcfValue, marketHigh),
    method:
      'The indicative range spans the selected DCF result and the transaction-derived market-multiple band. It is not a mechanical average.',
  };
}
