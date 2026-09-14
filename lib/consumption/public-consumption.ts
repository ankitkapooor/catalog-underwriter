import type {
  AnnualizedConsumptionEvidence,
  Confidence,
  ModelInput,
  PublicConsumptionEstimate,
  YouTubeVideoEvidence,
} from '../../types/catalog.ts';
import type { LastFmTrackSignal } from '../providers/catalog-provider.ts';

export const PUBLIC_CONSUMPTION_METHODOLOGY_VERSION =
  'public-consumption-1.0.0';

export type PublicConsumptionEvidence = {
  lastFmTracks: LastFmTrackSignal[];
  youtubeVideos: YouTubeVideoEvidence[];
  audioAnnualization?: AnnualizedConsumptionEvidence | null;
  youtubeAnnualization?: AnnualizedConsumptionEvidence | null;
  retrievedAt: string;
};

function validAnnualEvidence(
  evidence: AnnualizedConsumptionEvidence | null | undefined,
): AnnualizedConsumptionEvidence | null {
  if (!evidence) return null;
  const { low, midpoint, high } = evidence.range;
  return Number.isFinite(low) &&
    Number.isFinite(midpoint) &&
    Number.isFinite(high) &&
    low >= 0 &&
    low <= midpoint &&
    midpoint <= high &&
    evidence.methodology.trim()
    ? evidence
    : null;
}

export function buildPublicConsumptionEstimate(
  evidence: PublicConsumptionEvidence,
): PublicConsumptionEstimate | null {
  const lastFmTracks = evidence.lastFmTracks.filter(
    (track) =>
      Number.isFinite(track.playcount) &&
      track.playcount >= 0 &&
      Number.isFinite(track.listeners) &&
      track.listeners >= 0,
  );
  const youtubeVideos = evidence.youtubeVideos.filter(
    (video) => Number.isFinite(video.viewCount) && video.viewCount >= 0,
  );
  const audioAnnualization = validAnnualEvidence(evidence.audioAnnualization);
  const youtubeAnnualization = validAnnualEvidence(
    evidence.youtubeAnnualization,
  );

  if (
    !lastFmTracks.length &&
    !youtubeVideos.length &&
    !audioAnnualization &&
    !youtubeAnnualization
  ) {
    return null;
  }

  const inputs: ModelInput[] = [];
  if (lastFmTracks.length) {
    const playcountTotal = lastFmTracks.reduce(
      (sum, track) => sum + track.playcount,
      0,
    );
    inputs.push({
      label: 'Last.fm top-track scrobbles',
      value: playcountTotal.toLocaleString('en-US'),
      method: 'observed',
      layer: 'observed-consumption',
      observationTiming: 'cumulative-observation',
      source: lastFmTracks[0]?.sourceUrl,
      note: 'Cumulative demand evidence only; it is not an annual stream count or royalty statement.',
    });
  }
  if (youtubeVideos.length) {
    inputs.push({
      label: 'Likely official YouTube views',
      value: youtubeVideos
        .reduce((sum, video) => sum + video.viewCount, 0)
        .toLocaleString('en-US'),
      method: 'observed',
      layer: 'observed-consumption',
      observationTiming: 'cumulative-observation',
      source: youtubeVideos[0]?.sourceUrl,
      note: `${youtubeVideos.length} conservatively matched official video, official audio, or artist-topic uploads.`,
    });
  }

  const appendAnnualizationInput = (
    label: string,
    annualization: AnnualizedConsumptionEvidence | null,
  ) => {
    if (!annualization) return;
    inputs.push({
      label,
      value: `${annualization.range.low.toLocaleString('en-US')}–${annualization.range.high.toLocaleString('en-US')}`,
      method:
        annualization.observationTiming === 'modeled-annualization'
          ? 'calculated'
          : 'observed',
      layer: 'modeled-consumption',
      observationTiming: annualization.observationTiming,
      source: annualization.source,
      note: annualization.methodology,
    });
  };
  appendAnnualizationInput(
    'Annual audio streaming equivalent',
    audioAnnualization,
  );
  appendAnnualizationInput('Annual YouTube views', youtubeAnnualization);

  const confidence: Confidence =
    audioAnnualization && youtubeAnnualization ? 'medium' : 'low';
  const hasAnnualEvidence = Boolean(audioAnnualization || youtubeAnnualization);

  return {
    audioStreamingEquivalent: audioAnnualization?.range ?? null,
    youtubeAnnualViews: youtubeAnnualization?.range ?? null,
    confidence,
    inputs,
    methodologyVersion: PUBLIC_CONSUMPTION_METHODOLOGY_VERSION,
    retrievedAt: evidence.retrievedAt,
    note: hasAnnualEvidence
      ? 'Annual ranges are labeled with their observation or annualization methodology; cumulative metrics remain separate.'
      : 'Only cumulative demand evidence is available. No annual consumption was inferred or fabricated.',
  };
}
