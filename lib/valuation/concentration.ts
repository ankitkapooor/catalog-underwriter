export type ConcentrationResult = {
  topOneShare: number;
  topFiveShare: number;
  topTenShare: number;
  longTailShare: number;
  hhi: number;
  label: 'Low' | 'Moderate' | 'High';
};

export function calculateConcentration(shares: number[]): ConcentrationResult {
  const cleaned = shares
    .filter((share) => Number.isFinite(share) && share > 0)
    .sort((a, b) => b - a);
  const total = cleaned.reduce((sum, share) => sum + share, 0);
  const normalized = total > 0 ? cleaned.map((share) => share / total) : [];
  const sum = (count: number) =>
    normalized.slice(0, count).reduce((value, share) => value + share, 0);
  const topOneShare = sum(1);
  const topFiveShare = sum(5);
  const topTenShare = sum(10);
  const hhi =
    normalized.reduce((value, share) => value + share ** 2, 0) * 10_000;

  return {
    topOneShare,
    topFiveShare,
    topTenShare,
    longTailShare: Math.max(0, 1 - topTenShare),
    hhi,
    label:
      topFiveShare >= 0.65 ? 'High' : topFiveShare >= 0.4 ? 'Moderate' : 'Low',
  };
}
