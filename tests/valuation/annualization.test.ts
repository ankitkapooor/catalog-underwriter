import assert from 'node:assert/strict';
import { test } from 'node:test';

import { lastFmAudioCalibration } from '../../config/consumption-annualization.ts';
import {
  annualizeLastFmAudio,
  annualizeYouTubeViews,
} from '../../lib/consumption/annualization.ts';
import type { YouTubeVideoEvidence } from '../../types/catalog.ts';

const video = (
  viewCount: number,
  publicationDate: string,
): YouTubeVideoEvidence => ({
  videoId: `video-${publicationDate}`,
  channelId: 'channel-1',
  channelTitle: 'ArtistVEVO',
  title: 'Artist - Track (Official Video)',
  viewCount,
  publicationDate,
  evidenceType: 'official-music-video',
  matchingConfidence: 'high',
  observationTiming: 'cumulative-observation',
  sourceUrl: 'https://www.youtube.com/watch?v=video-1',
});

test('Last.fm listeners become a modeled annual audio stream range', () => {
  const estimate = annualizeLastFmAudio([
    { name: 'A', playcount: 50_000_000, listeners: 3_000_000, sourceUrl: '' },
    { name: 'B', playcount: 20_000_000, listeners: 1_000_000, sourceUrl: '' },
  ]);

  assert.ok(estimate);
  const {
    annualSpotifyStreamsPerTopTrackListener,
    spotifyShareOfGlobalAudioStreams,
  } = lastFmAudioCalibration;
  assert.equal(
    estimate.range.midpoint,
    Math.round(
      (4_000_000 / spotifyShareOfGlobalAudioStreams) *
        annualSpotifyStreamsPerTopTrackListener.midpoint,
    ),
  );
  assert.ok(estimate.range.low < estimate.range.midpoint);
  assert.ok(estimate.range.midpoint < estimate.range.high);
  assert.equal(estimate.observationTiming, 'modeled-annualization');
  assert.match(estimate.methodology, /calibrated on 29 artists/);
});

test('only the top 25 tracks by plays count, matching the calibration', () => {
  const tracks = Array.from({ length: 40 }, (_, index) => ({
    name: `Track ${index}`,
    playcount: 1_000 - index,
    listeners: index < 25 ? 1_000 : 1_000_000,
    sourceUrl: '',
  }));
  const estimate = annualizeLastFmAudio(tracks.reverse());

  assert.ok(estimate);
  const {
    annualSpotifyStreamsPerTopTrackListener,
    spotifyShareOfGlobalAudioStreams,
  } = lastFmAudioCalibration;
  assert.equal(
    estimate.range.midpoint,
    Math.round(
      (25_000 / spotifyShareOfGlobalAudioStreams) *
        annualSpotifyStreamsPerTopTrackListener.midpoint,
    ),
  );
});

test('no Last.fm listeners means no audio annualization', () => {
  assert.equal(annualizeLastFmAudio([]), null);
  assert.equal(
    annualizeLastFmAudio([
      { name: 'A', playcount: 10, listeners: 0, sourceUrl: '' },
    ]),
    null,
  );
});

test('YouTube views are annualized over age with the trailing-year ratio', () => {
  const estimate = annualizeYouTubeViews(
    [video(1_000_000_000, '2016-10-18T00:00:00Z')],
    '2026-10-18T00:00:00Z',
  );

  assert.ok(estimate);
  // 1B views over ~10 years ≈ 100M a year, × 0.75 base ratio.
  assert.ok(Math.abs(estimate.range.midpoint - 75_000_000) < 100_000);
  assert.match(estimate.methodology, /this is a floor/);
});

test('uploads younger than a year are not multiplied up into a run rate', () => {
  const estimate = annualizeYouTubeViews(
    [video(40_000_000, '2026-09-18T00:00:00Z')],
    '2026-10-18T00:00:00Z',
  );

  assert.ok(estimate);
  assert.equal(estimate.range.midpoint, 30_000_000);
});

test('no usable uploads means no YouTube annualization', () => {
  assert.equal(annualizeYouTubeViews([], '2026-10-18T00:00:00Z'), null);
  assert.equal(
    annualizeYouTubeViews([video(5, 'not a date')], '2026-10-18T00:00:00Z'),
    null,
  );
});
