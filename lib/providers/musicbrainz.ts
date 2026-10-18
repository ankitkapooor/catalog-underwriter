import type {
  ArtistSearchResult,
  CatalogRelease,
  CatalogSnapshot,
} from '@/types/catalog';

import type { MusicBrainzProvider } from './catalog-provider';

const BASE_URL = 'https://musicbrainz.org/ws/2';
const MUSICBRAINZ_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'CatalogUnderwriter/1.0 (catalog.ankitkapoor.me)',
};
const MIN_REQUEST_INTERVAL_MS = 1_100;
const RETRY_DELAYS_MS = [1_500, 3_000, 6_000] as const;
const MAX_RETRIES = RETRY_DELAYS_MS.length;
// Artist lookups with inc=release-groups stop at 25, so release groups are
// browsed instead. Ten throttled pages keep prolific artists under ~12 seconds.
const RELEASE_GROUP_PAGE_SIZE = 100;
const MAX_RELEASE_GROUP_PAGES = 10;

type Sleep = (milliseconds: number) => Promise<void>;
type MusicBrainzRequestOptions = { sleep?: Sleep };

const sleep: Sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

// Every network attempt, including retries, passes through this queue. Keeping
// the queue at module scope makes the throttle global to all provider calls in
// this runtime instead of creating a separate timer for each request.
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestStartedAt = 0;

function enqueueMusicBrainzRequest<T>(
  request: () => Promise<T>,
  wait: Sleep,
): Promise<T> {
  const next = requestQueue.then(async () => {
    const elapsed = Date.now() - lastRequestStartedAt;
    const waitForThrottle = Math.max(0, MIN_REQUEST_INTERVAL_MS - elapsed);
    if (waitForThrottle > 0) await wait(waitForThrottle);
    lastRequestStartedAt = Date.now();
    return request();
  });

  // A failed request must not permanently poison the queue for later calls.
  requestQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function retryAfterMilliseconds(value: string | null): number {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const retryAt = Date.parse(value);
  return Number.isNaN(retryAt) ? 0 : Math.max(0, retryAt - Date.now());
}

function exhaustedError(status: number): Error {
  if (status === 503 || status === 429) {
    return new Error(
      'MusicBrainz is temporarily rate-limiting or unavailable. Please try again shortly.',
    );
  }
  return new Error(`MusicBrainz returned ${status}.`);
}

type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
};

type MusicBrainzArtist = {
  id: string;
  name: string;
  'sort-name'?: string;
  country?: string;
  disambiguation?: string;
  type?: string;
  score?: number;
  'life-span'?: { begin?: string; end?: string; ended?: boolean };
  genres?: Array<{ name: string; count: number }>;
};

type MusicBrainzReleaseGroupBrowse = {
  'release-group-count'?: number;
  'release-groups'?: MusicBrainzReleaseGroup[];
};

export async function fetchMusicBrainz<T>(
  url: string,
  options: MusicBrainzRequestOptions = {},
): Promise<T> {
  const wait = options.sleep ?? sleep;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await enqueueMusicBrainzRequest(
      () =>
        fetch(url, {
          headers: MUSICBRAINZ_HEADERS,
          next: { revalidate: 86_400 },
        } as RequestInit & { next: { revalidate: number } }),
      wait,
    );

    if (response.ok) return response.json() as Promise<T>;

    const retryable = response.status === 503 || response.status === 429;
    if (!retryable || attempt === MAX_RETRIES) {
      throw exhaustedError(response.status);
    }

    const calculatedDelay = RETRY_DELAYS_MS[attempt];
    const retryAfter = retryAfterMilliseconds(
      response.headers.get('Retry-After'),
    );
    await wait(Math.max(calculatedDelay, retryAfter));
  }

  throw new Error('MusicBrainz request failed unexpectedly.');
}

/** Reset only for isolated unit tests; production callers should never use it. */
export function resetMusicBrainzThrottleForTests() {
  requestQueue = Promise.resolve();
  lastRequestStartedAt = 0;
}

const toSearchResult = (artist: MusicBrainzArtist): ArtistSearchResult => ({
  musicBrainzId: artist.id,
  name: artist.name,
  sortName: artist['sort-name'],
  country: artist.country,
  disambiguation: artist.disambiguation,
  type: artist.type,
  score: artist.score ?? 0,
});

export class MusicBrainzCatalogProvider implements MusicBrainzProvider {
  private readonly requestOptions: MusicBrainzRequestOptions;

  constructor(requestOptions: MusicBrainzRequestOptions = {}) {
    this.requestOptions = requestOptions;
  }

  async searchArtist(query: string) {
    const url = `${BASE_URL}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=8`;
    const data = await fetchMusicBrainz<{ artists: MusicBrainzArtist[] }>(
      url,
      this.requestOptions,
    );
    return data.artists.map(toSearchResult);
  }

  /**
   * Browses the artist's release groups using MusicBrainz's website default,
   * which leaves out bootleg-only and pseudo-release groups. A failed later
   * page keeps the groups already loaded instead of failing the whole catalog.
   */
  private async browseReleaseGroups(id: string) {
    const releaseGroups: MusicBrainzReleaseGroup[] = [];
    let total = 0;

    for (let page = 0; page < MAX_RELEASE_GROUP_PAGES; page += 1) {
      const url = `${BASE_URL}/release-group?artist=${encodeURIComponent(id)}&release-group-status=website-default&limit=${RELEASE_GROUP_PAGE_SIZE}&offset=${page * RELEASE_GROUP_PAGE_SIZE}&fmt=json`;
      let data: MusicBrainzReleaseGroupBrowse;
      try {
        data = await fetchMusicBrainz<MusicBrainzReleaseGroupBrowse>(
          url,
          this.requestOptions,
        );
      } catch (error) {
        if (page === 0) throw error;
        break;
      }

      const batch = data['release-groups'] ?? [];
      total = data['release-group-count'] ?? total;
      releaseGroups.push(...batch);
      if (!batch.length || releaseGroups.length >= total) break;
    }

    return {
      releaseGroups,
      total: Math.max(total, releaseGroups.length),
    };
  }

  async getArtistCatalog(id: string): Promise<CatalogSnapshot> {
    const url = `${BASE_URL}/artist/${encodeURIComponent(id)}?inc=genres&fmt=json`;
    const artist = await fetchMusicBrainz<MusicBrainzArtist>(
      url,
      this.requestOptions,
    );
    const { releaseGroups, total: releaseGroupTotal } =
      await this.browseReleaseGroups(id);
    const retrievedAt = new Date().toISOString();
    // A person's life-span is birth and death, not a career span.
    const lifeSpan = artist.type === 'Person' ? undefined : artist['life-span'];
    const releases: CatalogRelease[] = releaseGroups
      .map((release) => ({
        id: release.id,
        title: release.title,
        year: release['first-release-date']
          ? Number(release['first-release-date'].slice(0, 4))
          : null,
        primaryType: release['primary-type'] ?? 'Other',
        secondaryTypes: release['secondary-types'] ?? [],
      }))
      .sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    const datedReleases = releases.filter((release) => release.year);
    const weightedCatalogAge = datedReleases.length
      ? datedReleases.reduce(
          (sum, release) =>
            sum + (new Date().getUTCFullYear() - (release.year ?? 0)),
          0,
        ) / datedReleases.length
      : 0;

    return {
      snapshotId: `musicbrainz-${id}-${retrievedAt.slice(0, 10)}`,
      snapshotLabel: 'Live MusicBrainz catalog',
      isStoredDemo: false,
      artist: toSearchResult(artist),
      retrievedAt,
      activeYears: lifeSpan?.begin
        ? `${lifeSpan.begin.slice(0, 4)}–${lifeSpan.end?.slice(0, 4) ?? 'present'}`
        : undefined,
      genres: (artist.genres ?? [])
        .sort((a, b) => b.count - a.count)
        .slice(0, 4)
        .map((genre) => genre.name),
      releases,
      recordingCount: {
        value: null,
        source: 'MusicBrainz live response',
        sourceUrl: `https://musicbrainz.org/artist/${id}`,
        retrievedAt,
        confidence: 'low',
        method: 'calculated',
        note: 'Recording-level normalization is unavailable in this lightweight live lookup; unknown is not treated as zero.',
      },
      weightedCatalogAge: {
        value: datedReleases.length
          ? Number(weightedCatalogAge.toFixed(1))
          : null,
        source: 'Catalog Underwriter from MusicBrainz release-group dates',
        sourceUrl: `https://musicbrainz.org/artist/${id}`,
        retrievedAt,
        confidence: datedReleases.length >= 5 ? 'medium' : 'low',
        method: 'calculated',
      },
      tracks: [],
      youtubeVideos: [],
      coverage: [
        {
          label: 'Release metadata',
          level: releases.length ? 'High' : 'Unavailable',
          detail:
            releases.length < releaseGroupTotal
              ? `${releases.length} of ${releaseGroupTotal} release groups loaded from MusicBrainz; the rest were not retrieved.`
              : `${releases.length} release groups returned by MusicBrainz.`,
        },
        {
          label: 'Public performance',
          level: 'Unavailable',
          detail:
            'Configure LASTFM_API_KEY to add relative track-demand evidence.',
        },
        {
          label: 'Ownership data',
          level: 'Low',
          detail:
            'No rights contracts were retrieved. Model inputs remain user assumptions.',
        },
        {
          label: 'Historic revenue',
          level: 'Not public',
          detail:
            'Enter known or hypothetical normalized annual cash flow to underwrite this catalog.',
        },
        {
          label: 'YouTube consumption',
          level: 'Unavailable',
          detail:
            'Configure YOUTUBE_API_KEY to add cumulative official-video evidence.',
        },
        {
          label: 'Annual consumption',
          level: 'Unavailable',
          detail:
            'No current annual or modeled annualized consumption evidence is available.',
        },
        {
          label: 'Normalized cash flow',
          level: 'Unavailable',
          detail:
            'Automatic economic cash-flow estimation is disabled without annual consumption and explicit rights economics.',
        },
      ],
      publicConsumptionEstimate: null,
      publicCashFlowEstimate: null,
    };
  }
}
