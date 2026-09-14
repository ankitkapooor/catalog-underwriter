import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  classifyOfficialVideo,
  YouTubeDataApiProvider,
} from '../../lib/providers/youtube.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('official matching retains official, audio, and topic uploads only', () => {
  assert.deepEqual(
    classifyOfficialVideo(
      'Taylor Swift',
      'Taylor Swift - Song (Official Video)',
      'TaylorSwiftVEVO',
    ),
    { evidenceType: 'official-music-video', matchingConfidence: 'high' },
  );
  assert.deepEqual(
    classifyOfficialVideo(
      'Taylor Swift',
      'Taylor Swift - Song (Official Audio)',
      'Taylor Swift Official',
    ),
    { evidenceType: 'official-audio', matchingConfidence: 'high' },
  );
  assert.deepEqual(
    classifyOfficialVideo('Taylor Swift', 'Song', 'Taylor Swift - Topic'),
    { evidenceType: 'artist-topic-upload', matchingConfidence: 'high' },
  );
  assert.equal(
    classifyOfficialVideo(
      'Taylor Swift',
      'Taylor Swift - Song (Fan Made)',
      'Taylor Swift Fans',
    ),
    null,
  );
});

test('YouTube provider retains identifiers, cumulative views, and confidence', async () => {
  let call = 0;
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) {
      return Response.json({
        items: [
          { id: { videoId: 'official-video' } },
          { id: { videoId: 'fan-video' } },
        ],
      });
    }
    return Response.json({
      items: [
        {
          id: 'official-video',
          snippet: {
            title: 'Artist - Track (Official Video)',
            channelId: 'official-channel',
            channelTitle: 'ArtistVEVO',
            publishedAt: '2020-01-01T00:00:00Z',
          },
          statistics: { viewCount: '123456' },
        },
        {
          id: 'fan-video',
          snippet: {
            title: 'Artist - Track reaction',
            channelId: 'fan-channel',
            channelTitle: 'Fan Account',
            publishedAt: '2021-01-01T00:00:00Z',
          },
          statistics: { viewCount: '999999999' },
        },
      ],
    });
  };

  const evidence = await new YouTubeDataApiProvider(
    'server-key',
  ).getOfficialVideoEvidence('Artist');

  assert.equal(call, 2);
  assert.equal(evidence.length, 1);
  assert.deepEqual(evidence[0], {
    videoId: 'official-video',
    channelId: 'official-channel',
    channelTitle: 'ArtistVEVO',
    title: 'Artist - Track (Official Video)',
    viewCount: 123456,
    publicationDate: '2020-01-01T00:00:00Z',
    evidenceType: 'official-music-video',
    matchingConfidence: 'high',
    observationTiming: 'cumulative-observation',
    sourceUrl: 'https://www.youtube.com/watch?v=official-video',
  });
});
