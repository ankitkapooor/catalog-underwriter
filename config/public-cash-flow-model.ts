/**
 * Public-demand calibration is intentionally separate from the DCF. These are
 * model assumptions, not platform royalty rates. Last.fm observations are a
 * scale signal; they are never multiplied by a per-stream payout.
 */
export const PUBLIC_CASH_FLOW_METHODOLOGY_VERSION = 'public-cash-flow-1.0.0';

export const publicCashFlowCalibration = {
  // Reference values anchor the model to a transparent, bounded order of
  // magnitude. They are calibration choices for an indicative range, not
  // reported industry economics.
  referencePlaycounts: 25_000_000,
  referencePeakListeners: 1_000_000,
  referenceAnnualCashFlow: 250_000,
  playcountElasticity: 0.55,
  listenerElasticity: 0.25,
  referenceReleaseCount: 12,
  expectedTopTrackCount: 25,
  concentrationTrackCount: 5,
  minimumTopTracks: 3,
  minimumPlaycounts: 100_000,
  minimumPeakListeners: 10_000,
  minimumReleases: 1,
  ageReferenceYears: 10,
  ageSlope: 0.01,
  neutralFactor: 1,
  minimumAgeFactor: 0.85,
  maximumAgeFactor: 1.15,
  minimumCoverageFactor: 0.55,
  minimumReleaseBreadthFactor: 0.6,
  maximumReleaseBreadthFactor: 1.4,
  highCoverageThreshold: 0.85,
  mediumCoverageThreshold: 0.65,
  highConcentrationThreshold: 0.6,
  minimumCashFlow: 25_000,
  maximumCashFlow: 50_000_000,
  baseLowMultiplier: 0.8,
  baseHighMultiplier: 1.25,
  baseUncertainty: 0.15,
  coverageUncertaintyWeight: 0.35,
  concentrationUncertaintyWeight: 0.3,
  minimumLowMultiplier: 0.25,
  maximumLowMultiplier: 0.7,
  minimumHighMultiplier: 1.4,
  maximumHighMultiplier: 2.5,
} as const;
