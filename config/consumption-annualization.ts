import type { EstimateRange } from '../types/catalog.ts';

export const CONSUMPTION_ANNUALIZATION_VERSION = 'public-annualization-1.0.0';

/**
 * Last.fm → annual on-demand audio streams for the whole catalog.
 *
 * Measured on 2026-10-18 across 29 artists spanning 1970s catalogs to current
 * releases: each artist's latest daily Spotify streams as lead artist on
 * kworb.net, annualized (× 365), divided by the summed Last.fm listeners of
 * the artist's top 25 tracks. Low, base and high are the 10th, 50th and 90th
 * percentiles, so 23 of the 29 artists fall inside the range; a tighter
 * interquartile range held only 15. Only the top 25 tracks are used in production too, so the
 * factor already covers the long tail. Listeners predicted held-out artists
 * better than scrobbles (typical error ×1.43 against ×1.53), but individual
 * artists still miss by up to ×5: Last.fm under-represents mainstream pop,
 * hip-hop and Latin catalogs and over-represents indie and rock.
 *
 * Spotify reported (citing Luminate) that 65% of global audio streams happen
 * on Spotify, so Spotify streams are grossed up to all audio platforms.
 */
export const lastFmAudioCalibration = {
  topTrackCount: 25,
  annualSpotifyStreamsPerTopTrackListener: {
    low: 65,
    midpoint: 150,
    high: 445,
  } satisfies EstimateRange,
  spotifyShareOfGlobalAudioStreams: 0.65,
  sampleSize: 29,
  measuredAt: '2026-10-18',
} as const;

/**
 * YouTube cumulative views → current annual views.
 *
 * Measured on 2026-10-18 across 93 official videos from 24 artists on
 * kworb.net: views in the last 12 complete months divided by lifetime views
 * per year since publication. Low, base and high are the 10th, 50th and 90th
 * percentiles. Old catalog hits often run above their lifetime average, so
 * the high case exceeds 1.
 */
export const youtubeRunRateCalibration = {
  trailingYearToLifetimeAverage: {
    low: 0.35,
    midpoint: 0.75,
    high: 2.05,
  } satisfies EstimateRange,
  // Younger uploads are annualized over a full year so a launch spike is not
  // multiplied up into a run rate.
  minimumAgeYears: 1,
  sampleSize: 93,
  measuredAt: '2026-10-18',
} as const;

export const CONSUMPTION_CALIBRATION_SOURCES = [
  {
    label: 'kworb.net daily Spotify streams by track',
    url: 'https://kworb.net/spotify/',
  },
  {
    label: 'kworb.net monthly YouTube views by video',
    url: 'https://kworb.net/youtube/',
  },
  {
    label: 'Spotify Q2 2025 earnings call: 65% of global audio streams',
    url: 'https://www.musicbusinessworldwide.com/learnings-from-spotifys-q2-2025-earnings-call-music-pro-tier/',
  },
] as const;
