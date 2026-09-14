import {
  publicCashFlowCalibration as calibration,
  PUBLIC_CASH_FLOW_METHODOLOGY_VERSION,
} from '../../config/public-cash-flow-model.ts';
import type {
  PublicCashFlowEstimate,
  PublicCashFlowModelInput,
} from '../../types/catalog.ts';

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

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const formatNumber = (value: number) => value.toLocaleString('en-US');

/**
 * Converts absolute public-demand observations into an indicative cash-flow
 * range. The calibration is deliberately elastic and bounded: it helps users
 * compare scale while making no claim that scrobbles are royalty-bearing.
 */
export function estimatePublicCashFlow(
  evidence: PublicCashFlowEvidence,
): PublicCashFlowEstimate | null {
  const validTracks = evidence.topTracks.filter(
    (track) =>
      Number.isFinite(track.playcount) &&
      track.playcount > 0 &&
      Number.isFinite(track.listeners) &&
      track.listeners > 0,
  );
  const playcountSum = validTracks.reduce(
    (sum, track) => sum + track.playcount,
    0,
  );
  const peakListeners = validTracks.reduce(
    (peak, track) => Math.max(peak, track.listeners),
    0,
  );
  const releaseCount =
    Number.isFinite(evidence.releaseCount) && evidence.releaseCount > 0
      ? evidence.releaseCount
      : 0;

  if (
    validTracks.length < calibration.minimumTopTracks ||
    playcountSum < calibration.minimumPlaycounts ||
    peakListeners < calibration.minimumPeakListeners ||
    releaseCount < calibration.minimumReleases
  ) {
    return null;
  }

  const coverageFactor = clamp(
    validTracks.length / calibration.expectedTopTrackCount,
    calibration.minimumCoverageFactor,
    calibration.neutralFactor,
  );
  const releaseBreadthFactor = clamp(
    Math.sqrt(releaseCount / calibration.referenceReleaseCount),
    calibration.minimumReleaseBreadthFactor,
    calibration.maximumReleaseBreadthFactor,
  );
  const ageCandidate =
    evidence.weightedCatalogAge ?? evidence.activeCareerYears;
  const age =
    ageCandidate != null && Number.isFinite(ageCandidate) && ageCandidate >= 0
      ? ageCandidate
      : null;
  const ageFactor =
    age == null
      ? calibration.neutralFactor
      : clamp(
          calibration.neutralFactor +
            (age - calibration.ageReferenceYears) * calibration.ageSlope,
          calibration.minimumAgeFactor,
          calibration.maximumAgeFactor,
        );
  const demandFactor =
    (playcountSum / calibration.referencePlaycounts) **
    calibration.playcountElasticity;
  const listenerFactor =
    (peakListeners / calibration.referencePeakListeners) **
    calibration.listenerElasticity;
  const midpoint = clamp(
    calibration.referenceAnnualCashFlow *
      demandFactor *
      listenerFactor *
      releaseBreadthFactor *
      ageFactor *
      coverageFactor,
    calibration.minimumCashFlow,
    calibration.maximumCashFlow,
  );

  const shares = validTracks
    .map((track) => track.playcount / playcountSum)
    .sort((a, b) => b - a);
  const topFiveShare = shares
    .slice(0, calibration.concentrationTrackCount)
    .reduce((sum, share) => sum + share, 0);
  const uncertainty =
    calibration.baseUncertainty +
    (1 - coverageFactor) * calibration.coverageUncertaintyWeight +
    topFiveShare * calibration.concentrationUncertaintyWeight;
  const lowMultiplier = clamp(
    calibration.baseLowMultiplier - uncertainty,
    calibration.minimumLowMultiplier,
    calibration.maximumLowMultiplier,
  );
  const highMultiplier = clamp(
    calibration.baseHighMultiplier + uncertainty,
    calibration.minimumHighMultiplier,
    calibration.maximumHighMultiplier,
  );
  const low = clamp(
    midpoint * lowMultiplier,
    calibration.minimumCashFlow,
    calibration.maximumCashFlow,
  );
  const high = clamp(
    midpoint * highMultiplier,
    calibration.minimumCashFlow,
    calibration.maximumCashFlow,
  );
  const confidence: PublicCashFlowEstimate['confidence'] =
    coverageFactor >= calibration.highCoverageThreshold &&
    topFiveShare < calibration.highConcentrationThreshold
      ? 'high'
      : coverageFactor >= calibration.mediumCoverageThreshold
        ? 'medium'
        : 'low';

  const inputs: PublicCashFlowModelInput[] = [
    {
      label: 'Observed Last.fm scrobbles in top-track response',
      value: formatNumber(playcountSum),
      method: 'observed',
      source: validTracks[0]?.sourceUrl,
    },
    {
      label: 'Observed peak Last.fm listeners',
      value: formatNumber(peakListeners),
      method: 'observed',
      source: validTracks.find((track) => track.listeners === peakListeners)
        ?.sourceUrl,
    },
    {
      label: 'Top-track observations included',
      value: `${validTracks.length} of ${calibration.expectedTopTrackCount} requested`,
      method: 'calculated',
    },
    {
      label: 'Release groups returned by MusicBrainz',
      value: formatNumber(releaseCount),
      method: 'observed',
    },
    {
      label: 'Weighted catalog age',
      value: age == null ? 'Unknown' : `${age.toFixed(1)} years`,
      method: age == null ? 'assumption' : 'calculated',
    },
    {
      label: 'Calibration anchor',
      value: `$${formatNumber(calibration.referenceAnnualCashFlow)} at ${formatNumber(calibration.referencePlaycounts)} scrobbles / ${formatNumber(calibration.referencePeakListeners)} listeners`,
      method: 'assumption',
    },
  ];

  return {
    low,
    midpoint,
    high,
    confidence,
    methodologyVersion: PUBLIC_CASH_FLOW_METHODOLOGY_VERSION,
    inputs,
    note: 'Indicative normalized economic cash flow calibrated from absolute public demand signals. Last.fm scrobbles and listeners are not royalty-bearing streams or direct Spotify payouts, and this is not a royalty statement or lifetime catalog total.',
    retrievedAt: evidence.retrievedAt,
  };
}
