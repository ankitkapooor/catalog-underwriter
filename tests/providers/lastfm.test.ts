import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  LASTFM_TOP_TRACK_LIMIT,
  LastFmPerformanceProvider,
} from '../../lib/providers/lastfm.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('requests far more than the former 25 top tracks', async () => {
  let requestedUrl: URL | undefined;
  globalThis.fetch = async (input) => {
    requestedUrl = new URL(String(input));
    return Response.json({
      toptracks: {
        track: Array.from({ length: 120 }, (_, index) => ({
          name: `Track ${index}`,
          playcount: String(1_000 - index),
          listeners: String(100 - (index % 100)),
          url: `https://www.last.fm/music/Artist/_/Track+${index}`,
        })),
      },
    });
  };

  const tracks = await new LastFmPerformanceProvider(
    'test-key',
  ).getTopTrackSignals('Artist');

  assert.equal(
    requestedUrl?.searchParams.get('limit'),
    String(LASTFM_TOP_TRACK_LIMIT),
  );
  assert.ok(LASTFM_TOP_TRACK_LIMIT > 25);
  assert.equal(tracks.length, 120);
});

test('looks the artist up by MusicBrainz ID before the name', async () => {
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    return Response.json({
      toptracks: {
        track: [
          {
            name: 'Stronger',
            playcount: '1000',
            listeners: '100',
            url: 'https://www.last.fm/music/Kanye+West/_/Stronger',
          },
        ],
      },
    });
  };

  const tracks = await new LastFmPerformanceProvider(
    'test-key',
  ).getTopTrackSignals('Ye', '164f0d73-1234-4e2c-8743-d77bf2191051');

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].searchParams.get('mbid'),
    '164f0d73-1234-4e2c-8743-d77bf2191051',
  );
  assert.equal(requests[0].searchParams.get('artist'), null);
  assert.equal(tracks[0].name, 'Stronger');
});

test('falls back to the name when Last.fm does not know the MusicBrainz ID', async () => {
  const requests: URL[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    requests.push(url);
    if (url.searchParams.has('mbid')) {
      return Response.json({
        error: 6,
        message: 'The artist you supplied could not be found',
      });
    }
    return Response.json({
      toptracks: {
        track: [
          {
            name: 'Track',
            playcount: '10',
            listeners: '5',
            url: 'https://www.last.fm/music/Artist/_/Track',
          },
        ],
      },
    });
  };

  const tracks = await new LastFmPerformanceProvider(
    'test-key',
  ).getTopTrackSignals('Artist', '00000000-0000-4000-8000-000000000000');

  assert.equal(requests.length, 2);
  assert.equal(requests[1].searchParams.get('artist'), 'Artist');
  assert.equal(requests[1].searchParams.get('autocorrect'), '1');
  assert.equal(tracks.length, 1);
});
