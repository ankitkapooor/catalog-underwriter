import { defaultRightsEconomicsAssumptions } from '../config/rights-economics.ts';
import {
  lastFmTrackEvidence,
  modelPublicEconomics,
} from '../lib/consumption/public-evidence.ts';
import type { LastFmTrackSignal } from '../lib/providers/catalog-provider.ts';
import type {
  ArtistSearchResult,
  CatalogRelease,
  CatalogSnapshot,
  CoverageItem,
  YouTubeVideoEvidence,
} from '../types/catalog.ts';
import storedEvidence from './kendrick-lamar-snapshot.json' with { type: 'json' };

/**
 * Public evidence captured from the live Kendrick Lamar lookup. Storing the
 * raw evidence instead of results means the demo always runs through the
 * current model, so the homepage matches a live search of the same data.
 */
type StoredEvidence = {
  retrievedAt: string;
  source: string;
  artist: ArtistSearchResult;
  genres: string[];
  releases: CatalogRelease[];
  officialRecordingCount: number | null;
  weightedCatalogAge: number | null;
  lastFmTracks: LastFmTrackSignal[];
  youtubeVideos: YouTubeVideoEvidence[];
  coverage: CoverageItem[];
};

const evidence = storedEvidence as unknown as StoredEvidence;
const { retrievedAt } = evidence;
const musicBrainzArtist = `https://musicbrainz.org/artist/${evidence.artist.musicBrainzId}`;
const modeled = modelPublicEconomics(
  {
    lastFmTracks: evidence.lastFmTracks,
    youtubeVideos: evidence.youtubeVideos,
    retrievedAt,
  },
  defaultRightsEconomicsAssumptions,
);

export const demoCatalog: CatalogSnapshot = {
  snapshotId: `kendrick-lamar-demo-${retrievedAt.slice(0, 10)}`,
  snapshotLabel: 'Stored demonstration snapshot',
  isStoredDemo: true,
  artist: evidence.artist,
  retrievedAt,
  genres: evidence.genres,
  releases: evidence.releases,
  recordingCount: {
    value: evidence.officialRecordingCount,
    source: 'MusicBrainz recording search (stored snapshot)',
    sourceUrl: `${musicBrainzArtist}/recordings`,
    retrievedAt,
    confidence: 'low',
    method: 'observed',
    note: 'Official, non-live, non-video MusicBrainz recordings credited to the artist. Features, clean edits, alternate mixes, and re-recordings each count separately, so this overstates distinct songs.',
  },
  weightedCatalogAge: {
    value: evidence.weightedCatalogAge,
    source: 'Catalog Underwriter from MusicBrainz release-group dates',
    sourceUrl: musicBrainzArtist,
    retrievedAt,
    confidence: 'medium',
    method: 'calculated',
  },
  tracks: lastFmTrackEvidence(evidence.lastFmTracks, retrievedAt),
  youtubeVideos: evidence.youtubeVideos,
  coverage: evidence.coverage,
  publicConsumptionEstimate: modeled.publicConsumptionEstimate,
  publicCashFlowEstimate: modeled.publicCashFlowEstimate,
};
