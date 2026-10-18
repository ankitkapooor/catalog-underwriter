import type {
  AnnualizedConsumptionEvidence,
  PublicCashFlowEstimate,
  PublicConsumptionEstimate,
  TrackEvidence,
  YouTubeVideoEvidence,
} from '../../types/catalog.ts';
import type { LastFmTrackSignal } from '../providers/catalog-provider.ts';
import { buildModeledCashFlowEstimate } from '../valuation/public-cash-flow.ts';
import type { RightsEconomicsAssumptions } from '../valuation/rights-economics.ts';
import { annualizeLastFmAudio, annualizeYouTubeViews } from './annualization.ts';
import { buildPublicConsumptionEstimate } from './public-consumption.ts';

/** Last.fm top tracks as track evidence with relative demand shares. */
export function lastFmTrackEvidence(
  signals: LastFmTrackSignal[],
  retrievedAt: string,
): TrackEvidence[] {
  const total = signals.reduce((sum, track) => sum + track.playcount, 0);
  return signals.map((track, index) => ({
    id: `lastfm-${index}`,
    title: track.name,
    demandShare: total > 0 ? (track.playcount / total) * 100 : 0,
    observationTiming: 'cumulative-observation',
    lastFmPlaycount: track.playcount,
    lastFmListeners: track.listeners,
    observedMetric: `${track.playcount.toLocaleString('en-US')} Last.fm scrobbles`,
    source: {
      value: `${track.playcount} scrobbles; ${track.listeners} listeners`,
      source: 'Last.fm artist top tracks',
      sourceUrl: track.sourceUrl,
      retrievedAt,
      confidence: 'medium',
      method: 'observed',
      note: 'Used for relative demand, concentration, and the modeled annual audio range—not as a direct revenue measure.',
    },
  }));
}

export type ModeledPublicEconomics = {
  audioAnnualization: AnnualizedConsumptionEvidence | null;
  youtubeAnnualization: AnnualizedConsumptionEvidence | null;
  publicConsumptionEstimate: PublicConsumptionEstimate | null;
  publicCashFlowEstimate: PublicCashFlowEstimate | null;
};

/**
 * Annualizes public demand and applies rights economics. Live lookups and
 * the stored demo both use this, so they always follow the same model.
 */
export function modelPublicEconomics(
  evidence: {
    lastFmTracks: LastFmTrackSignal[];
    youtubeVideos: YouTubeVideoEvidence[];
    retrievedAt: string;
  },
  economics: RightsEconomicsAssumptions,
): ModeledPublicEconomics {
  const audioAnnualization = annualizeLastFmAudio(evidence.lastFmTracks);
  const youtubeAnnualization = annualizeYouTubeViews(
    evidence.youtubeVideos,
    evidence.retrievedAt,
  );
  const publicConsumptionEstimate = buildPublicConsumptionEstimate({
    ...evidence,
    audioAnnualization,
    youtubeAnnualization,
  });
  return {
    audioAnnualization,
    youtubeAnnualization,
    publicConsumptionEstimate,
    publicCashFlowEstimate: buildModeledCashFlowEstimate(
      publicConsumptionEstimate,
      economics,
    ),
  };
}
