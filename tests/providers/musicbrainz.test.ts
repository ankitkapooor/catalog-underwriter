import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  fetchMusicBrainz,
  MusicBrainzCatalogProvider,
  resetMusicBrainzThrottleForTests,
} from '../../lib/providers/musicbrainz.ts';

const ARTIST_ID = 'a74b1b7f-71a5-4011-9441-d0b5e4122711';
const noSleep = { sleep: async () => undefined };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function releaseGroups(count: number, start: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `rg-${start + index}`,
    title: `Release ${start + index}`,
    'first-release-date': `${2000 + ((start + index) % 20)}-01-01`,
    'primary-type': 'Album',
    'secondary-types': [],
  }));
}

function mockCatalogFetch(
  total: number,
  failOffset?: number,
  recordingCount: number | 'fail' = 0,
): { offsets: number[]; recordingQueries: string[] } {
  const offsets: number[] = [];
  const recordingQueries: string[] = [];
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/recording')) {
      recordingQueries.push(url.searchParams.get('query') ?? '');
      return recordingCount === 'fail'
        ? json({ error: 'Bad request' }, 400)
        : json({ count: recordingCount, recordings: [] });
    }
    if (url.pathname.endsWith(`/artist/${ARTIST_ID}`)) {
      return json({
        id: ARTIST_ID,
        name: 'Radiohead',
        country: 'GB',
        'life-span': { begin: '1985', ended: false },
        genres: [{ name: 'alternative rock', count: 10 }],
      });
    }
    const offset = Number(url.searchParams.get('offset'));
    offsets.push(offset);
    if (offset === failOffset) return json({ error: 'Not found' }, 404);
    const limit = Number(url.searchParams.get('limit'));
    return json({
      'release-group-count': total,
      'release-group-offset': offset,
      'release-groups': releaseGroups(
        Math.max(0, Math.min(limit, total - offset)),
        offset,
      ),
    });
  };
  return { offsets, recordingQueries };
}

const originalFetch = globalThis.fetch;

function response(status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify({ ok: true }), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  resetMusicBrainzThrottleForTests();
});

test('preserves the required request headers and Next cache setting', async () => {
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestInit = init;
    return response(200);
  };

  await fetchMusicBrainz<{ ok: boolean }>('https://musicbrainz.org/ws/2/test');

  const headers = new Headers(requestInit?.headers);
  assert.equal(headers.get('Accept'), 'application/json');
  assert.equal(
    headers.get('User-Agent'),
    'CatalogUnderwriter/1.0 (catalog.ankitkapoor.me)',
  );
  assert.deepEqual((requestInit as RequestInit & { next?: unknown }).next, {
    revalidate: 86_400,
  });
});

test('serializes concurrent calls at least 1.1 seconds apart', async () => {
  const starts: number[] = [];
  globalThis.fetch = async () => {
    starts.push(Date.now());
    return response(200);
  };

  await Promise.all([
    fetchMusicBrainz('https://musicbrainz.org/ws/2/one'),
    fetchMusicBrainz('https://musicbrainz.org/ws/2/two'),
  ]);

  assert.equal(starts.length, 2);
  assert.ok(starts[1] - starts[0] >= 1_050);
});

test('retries a 503 and succeeds on the next attempt', async () => {
  let calls = 0;
  const waits: number[] = [];
  globalThis.fetch = async () => {
    calls += 1;
    return response(calls === 1 ? 503 : 200);
  };

  await fetchMusicBrainz('https://musicbrainz.org/ws/2/test', {
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });

  assert.equal(calls, 2);
  assert.ok(waits.includes(1_500));
});

test('uses a longer Retry-After value than exponential backoff', async () => {
  let calls = 0;
  const waits: number[] = [];
  globalThis.fetch = async () => {
    calls += 1;
    return response(calls === 1 ? 429 : 200, { 'Retry-After': '4' });
  };

  await fetchMusicBrainz('https://musicbrainz.org/ws/2/test', {
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });

  assert.equal(calls, 2);
  assert.ok(waits.includes(4_000));
});

test('retries a 429 and succeeds on the next attempt', async () => {
  let calls = 0;
  const waits: number[] = [];
  globalThis.fetch = async () => {
    calls += 1;
    return response(calls === 1 ? 429 : 200);
  };

  await fetchMusicBrainz('https://musicbrainz.org/ws/2/test', {
    sleep: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });

  assert.equal(calls, 2);
  assert.ok(waits.includes(1_500));
});

test('throws the temporary-unavailable message after three retries', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return response(503);
  };

  await assert.rejects(
    fetchMusicBrainz('https://musicbrainz.org/ws/2/test', {
      sleep: async () => undefined,
    }),
    {
      message:
        'MusicBrainz is temporarily rate-limiting or unavailable. Please try again shortly.',
    },
  );
  assert.equal(calls, 4);
});

test('does not retry an ordinary 404', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return response(404);
  };

  await assert.rejects(
    fetchMusicBrainz('https://musicbrainz.org/ws/2/not-found', {
      sleep: async () => undefined,
    }),
    { message: 'MusicBrainz returned 404.' },
  );
  assert.equal(calls, 1);
});

test('pages through release groups beyond the 25-item lookup cap', async () => {
  const { offsets } = mockCatalogFetch(230);

  const catalog = await new MusicBrainzCatalogProvider(
    noSleep,
  ).getArtistCatalog(ARTIST_ID);

  assert.deepEqual(offsets, [0, 100, 200]);
  assert.equal(catalog.releases.length, 230);
  assert.equal(new Set(catalog.releases.map((r) => r.id)).size, 230);
  assert.equal(
    catalog.coverage.find((item) => item.label === 'Release metadata')?.detail,
    '230 release groups returned by MusicBrainz.',
  );
});

test('excludes bootleg-only release groups like the MusicBrainz website', async () => {
  let browseUrl: URL | undefined;
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/release-group')) browseUrl = url;
    return json({ id: ARTIST_ID, name: 'Radiohead', 'release-groups': [] });
  };

  await new MusicBrainzCatalogProvider(noSleep).getArtistCatalog(ARTIST_ID);

  assert.equal(browseUrl?.searchParams.get('artist'), ARTIST_ID);
  assert.equal(
    browseUrl?.searchParams.get('release-group-status'),
    'website-default',
  );
  assert.equal(browseUrl?.searchParams.get('limit'), '100');
});

test('reads active years from the MusicBrainz life-span field', async () => {
  mockCatalogFetch(3);

  const catalog = await new MusicBrainzCatalogProvider(
    noSleep,
  ).getArtistCatalog(ARTIST_ID);

  assert.equal(catalog.activeYears, '1985–present');
});

test('does not present a solo artist birth year as active years', async () => {
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith('/release-group')) {
      return json({ 'release-group-count': 0, 'release-groups': [] });
    }
    return json({
      id: ARTIST_ID,
      name: 'Kendrick Lamar',
      type: 'Person',
      'life-span': { begin: '1987-06-17', ended: false },
    });
  };

  const catalog = await new MusicBrainzCatalogProvider(
    noSleep,
  ).getArtistCatalog(ARTIST_ID);

  assert.equal(catalog.activeYears, undefined);
});

test('keeps loaded release groups when a later page fails', async () => {
  mockCatalogFetch(230, 100);

  const catalog = await new MusicBrainzCatalogProvider(
    noSleep,
  ).getArtistCatalog(ARTIST_ID);

  assert.equal(catalog.releases.length, 100);
  assert.equal(
    catalog.coverage.find((item) => item.label === 'Release metadata')?.detail,
    '100 of 230 release groups loaded from MusicBrainz; the rest were not retrieved.',
  );
});

test('still fails the catalog when the first release-group page fails', async () => {
  mockCatalogFetch(230, 0);

  await assert.rejects(
    new MusicBrainzCatalogProvider(noSleep).getArtistCatalog(ARTIST_ID),
    { message: 'MusicBrainz returned 404.' },
  );
});

test('counts official, non-live recordings credited to the artist', async () => {
  const { recordingQueries } = mockCatalogFetch(3, undefined, 649);

  const catalog = await new MusicBrainzCatalogProvider(
    noSleep,
  ).getArtistCatalog(ARTIST_ID);

  assert.equal(catalog.recordingCount.value, 649);
  assert.equal(recordingQueries.length, 1);
  assert.match(recordingQueries[0], new RegExp(`arid:${ARTIST_ID}`));
  assert.match(recordingQueries[0], /status:official/);
  assert.match(recordingQueries[0], /video:false/);
  assert.match(recordingQueries[0], /NOT secondarytype:\(live/);
  assert.match(catalog.recordingCount.note ?? '', /overstates distinct songs/);
});

test('a failed recording count stays unknown without failing the catalog', async () => {
  mockCatalogFetch(3, undefined, 'fail');

  const catalog = await new MusicBrainzCatalogProvider(
    noSleep,
  ).getArtistCatalog(ARTIST_ID);

  assert.equal(catalog.releases.length, 3);
  assert.equal(catalog.recordingCount.value, null);
});
