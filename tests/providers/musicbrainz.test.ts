import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  fetchMusicBrainz,
  resetMusicBrainzThrottleForTests,
} from '../../lib/providers/musicbrainz.ts';

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
