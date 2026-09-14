import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildPublicConsumptionEstimate } from '../../lib/consumption/public-consumption.ts';

const retrievedAt = '2026-09-15T00:00:00.000Z';

test('cumulative Last.fm and YouTube evidence does not become annual consumption', () => {
  const estimate = buildPublicConsumptionEstimate({
    lastFmTracks: [
      {
        name: 'Track',
        playcount: 900_000_000,
        listeners: 40_000_000,
        sourceUrl: 'https://www.last.fm/music/Artist/_/Track',
      },
    ],
    youtubeVideos: [
      {
        videoId: 'video-1',
        channelId: 'channel-1',
        channelTitle: 'ArtistVEVO',
        title: 'Artist - Track (Official Video)',
        viewCount: 2_000_000_000,
        publicationDate: '2015-01-01T00:00:00Z',
        evidenceType: 'official-music-video',
        matchingConfidence: 'high',
        observationTiming: 'cumulative-observation',
        sourceUrl: 'https://www.youtube.com/watch?v=video-1',
      },
    ],
    retrievedAt,
  });

  assert.ok(estimate);
  assert.equal(estimate.audioStreamingEquivalent, null);
  assert.equal(estimate.youtubeAnnualViews, null);
  assert.ok(
    estimate.inputs.every(
      (input) => input.observationTiming === 'cumulative-observation',
    ),
  );
});

test('explicit annualization evidence retains its timing and methodology', () => {
  const estimate = buildPublicConsumptionEstimate({
    lastFmTracks: [],
    youtubeVideos: [],
    audioAnnualization: {
      range: { low: 80_000_000, midpoint: 100_000_000, high: 130_000_000 },
      observationTiming: 'modeled-annualization',
      methodology: 'Trailing quarterly observations annualized at 4×.',
      source: 'Verified provider fixture',
    },
    retrievedAt,
  });

  assert.deepEqual(estimate?.audioStreamingEquivalent, {
    low: 80_000_000,
    midpoint: 100_000_000,
    high: 130_000_000,
  });
  assert.equal(estimate?.inputs[0]?.observationTiming, 'modeled-annualization');
  assert.match(estimate?.inputs[0]?.note ?? '', /quarterly observations/);
});
