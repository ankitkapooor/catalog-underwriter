import {
  lastFmAudioCalibration,
  youtubeRunRateCalibration,
} from '../../config/consumption-annualization.ts';
import type {
  AnnualizedConsumptionEvidence,
  EstimateRange,
  YouTubeVideoEvidence,
} from '../../types/catalog.ts';
import type { LastFmTrackSignal } from '../providers/catalog-provider.ts';

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1_000;

const formatCount = (value: number) =>
  Math.round(value).toLocaleString('en-US');

function scale(value: number, factors: EstimateRange): EstimateRange {
  return {
    low: Math.round(value * factors.low),
    midpoint: Math.round(value * factors.midpoint),
    high: Math.round(value * factors.high),
  };
}

/**
 * Converts the Last.fm listeners of an artist's top tracks into an annual
 * whole-catalog audio stream range using the disclosed Spotify calibration,
 * grossed up to all audio platforms.
 */
export function annualizeLastFmAudio(
  tracks: LastFmTrackSignal[],
): AnnualizedConsumptionEvidence | null {
  const {
    topTrackCount,
    annualSpotifyStreamsPerTopTrackListener: perListener,
    spotifyShareOfGlobalAudioStreams: spotifyShare,
    sampleSize,
    measuredAt,
  } = lastFmAudioCalibration;
  // The calibration is per top-track listener, so deeper tracks are excluded.
  const topTracks = [...tracks]
    .sort((a, b) => (b.playcount || 0) - (a.playcount || 0))
    .slice(0, topTrackCount);
  const listeners = topTracks.reduce(
    (sum, track) =>
      Number.isFinite(track.listeners) && track.listeners > 0
        ? sum + track.listeners
        : sum,
    0,
  );
  if (listeners <= 0) return null;

  return {
    range: scale(listeners / spotifyShare, perListener),
    observationTiming: 'modeled-annualization',
    methodology: `${formatCount(listeners)} Last.fm listeners summed across the top ${topTracks.length} tracks × ${perListener.midpoint} annual whole-catalog Spotify streams per top-track listener (low ${perListener.low}, high ${perListener.high}; calibrated on ${sampleSize} artists, ${measuredAt}) ÷ Spotify's ${Math.round(spotifyShare * 100)}% share of global audio streams. Individual artists can miss by up to ×5.`,
    source: 'Last.fm top tracks with kworb.net Spotify calibration',
  };
}

/**
 * Converts cumulative views on matched official uploads into a current annual
 * view range. Each video's lifetime average views per year is scaled by the
 * measured trailing-year ratio; unmatched uploads are not counted.
 */
export function annualizeYouTubeViews(
  videos: YouTubeVideoEvidence[],
  asOf: string,
): AnnualizedConsumptionEvidence | null {
  const asOfTime = Date.parse(asOf);
  if (!Number.isFinite(asOfTime)) return null;

  let lifetimeAnnualViews = 0;
  let counted = 0;
  for (const video of videos) {
    const published = Date.parse(video.publicationDate);
    if (
      !Number.isFinite(video.viewCount) ||
      video.viewCount < 0 ||
      !Number.isFinite(published)
    ) {
      continue;
    }
    const ageYears = Math.max(
      youtubeRunRateCalibration.minimumAgeYears,
      (asOfTime - published) / MS_PER_YEAR,
    );
    lifetimeAnnualViews += video.viewCount / ageYears;
    counted += 1;
  }
  if (!counted || lifetimeAnnualViews <= 0) return null;

  const {
    trailingYearToLifetimeAverage: ratio,
    sampleSize,
    measuredAt,
  } = youtubeRunRateCalibration;

  return {
    range: scale(lifetimeAnnualViews, ratio),
    observationTiming: 'modeled-annualization',
    methodology: `${formatCount(lifetimeAnnualViews)} lifetime-average views per year across ${counted} matched official uploads × ${ratio.midpoint} trailing-year ratio (low ${ratio.low}, high ${ratio.high}; measured on ${sampleSize} videos, ${measuredAt}). Unmatched uploads are not counted, so this is a floor.`,
    source: 'YouTube Data API with kworb.net view-history calibration',
  };
}
