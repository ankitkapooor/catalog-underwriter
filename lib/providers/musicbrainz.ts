import type {
  ArtistSearchResult,
  CatalogRelease,
  CatalogSnapshot,
} from '@/types/catalog';

import type { CatalogProvider } from './catalog-provider';

const BASE_URL = 'https://musicbrainz.org/ws/2';
const HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'CatalogUnderwriter/1.0 (catalog.ankitkapoor.me)',
};

type MusicBrainzArtist = {
  id: string;
  name: string;
  'sort-name'?: string;
  country?: string;
  disambiguation?: string;
  type?: string;
  score?: number;
  lifeSpan?: { begin?: string; end?: string; ended?: boolean };
  genres?: Array<{ name: string; count: number }>;
  'release-groups'?: Array<{
    id: string;
    title: string;
    'first-release-date'?: string;
    'primary-type'?: string;
    'secondary-types'?: string[];
  }>;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: HEADERS,
    next: { revalidate: 86_400 },
  } as RequestInit & { next: { revalidate: number } });
  if (!response.ok) {
    throw new Error(
      `MusicBrainz returned ${response.status}. Try again after its public service recovers.`,
    );
  }
  return response.json() as Promise<T>;
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

export class MusicBrainzCatalogProvider implements CatalogProvider {
  async searchArtist(query: string) {
    const url = `${BASE_URL}/artist?query=${encodeURIComponent(query)}&fmt=json&limit=8`;
    const data = await fetchJson<{ artists: MusicBrainzArtist[] }>(url);
    return data.artists.map(toSearchResult);
  }

  async getArtistCatalog(id: string): Promise<CatalogSnapshot> {
    const url = `${BASE_URL}/artist/${encodeURIComponent(id)}?inc=release-groups+genres&fmt=json`;
    const artist = await fetchJson<MusicBrainzArtist>(url);
    const retrievedAt = new Date().toISOString();
    const releases: CatalogRelease[] = (artist['release-groups'] ?? [])
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
      activeYears: artist.lifeSpan?.begin
        ? `${artist.lifeSpan.begin.slice(0, 4)}–${artist.lifeSpan.end?.slice(0, 4) ?? 'present'}`
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
        value: Number(weightedCatalogAge.toFixed(1)),
        source: 'Catalog Underwriter from MusicBrainz release-group dates',
        sourceUrl: `https://musicbrainz.org/artist/${id}`,
        retrievedAt,
        confidence: datedReleases.length >= 5 ? 'medium' : 'low',
        method: 'calculated',
      },
      tracks: [],
      coverage: [
        {
          label: 'Release metadata',
          level: releases.length ? 'High' : 'Unavailable',
          detail: `${releases.length} release groups returned by MusicBrainz.`,
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
      ],
      publicCashFlowEstimate: null,
    };
  }
}
