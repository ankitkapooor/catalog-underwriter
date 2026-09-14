import type { CatalogSnapshot, TrackEvidence } from '@/types/catalog';

const retrievedAt = '2026-09-14T00:00:00.000Z';
const billboardEvidence =
  'https://ca.billboard.com/music/chart-beat/kendrick-lamar-not-like-us-number-one-second-week-global-200-1235731277/';
const musicBrainzArtist =
  'https://musicbrainz.org/artist/381086ea-f511-4aba-bdf9-71c753dc5077';

const track = (
  id: string,
  title: string,
  demandShare: number,
  observedMetric: string,
): TrackEvidence => ({
  id,
  title,
  demandShare,
  observedMetric,
  source: {
    value: observedMetric,
    source: 'Stored public-performance snapshot',
    sourceUrl:
      title === 'Not Like Us'
        ? billboardEvidence
        : 'https://www.last.fm/music/Kendrick+Lamar/+tracks',
    retrievedAt,
    confidence: 'medium',
    method: 'calculated',
    note: 'Relative demand share is a model normalization across observed public signals; it is not a royalty allocation.',
  },
});

export const demoCatalog: CatalogSnapshot = {
  snapshotId: 'kendrick-lamar-demo-2026-09-14',
  snapshotLabel: 'Stored demonstration snapshot',
  isStoredDemo: true,
  artist: {
    musicBrainzId: '381086ea-f511-4aba-bdf9-71c753dc5077',
    name: 'Kendrick Lamar',
    sortName: 'Lamar, Kendrick',
    country: 'US',
    disambiguation: 'US rapper and songwriter',
    type: 'Person',
    score: 100,
  },
  retrievedAt,
  activeYears: '2003–present',
  genres: ['Hip hop', 'West Coast hip hop', 'conscious hip hop'],
  releases: [
    {
      id: 'gnx',
      title: 'GNX',
      year: 2024,
      primaryType: 'Album',
      secondaryTypes: [],
    },
    {
      id: 'mmatbs',
      title: 'Mr. Morale & the Big Steppers',
      year: 2022,
      primaryType: 'Album',
      secondaryTypes: [],
    },
    {
      id: 'bp',
      title: 'Black Panther: The Album',
      year: 2018,
      primaryType: 'Album',
      secondaryTypes: ['Soundtrack'],
    },
    {
      id: 'damn',
      title: 'DAMN.',
      year: 2017,
      primaryType: 'Album',
      secondaryTypes: [],
    },
    {
      id: 'tpab',
      title: 'To Pimp a Butterfly',
      year: 2015,
      primaryType: 'Album',
      secondaryTypes: [],
    },
    {
      id: 'gkmc',
      title: 'good kid, m.A.A.d city',
      year: 2012,
      primaryType: 'Album',
      secondaryTypes: [],
    },
    {
      id: 's80',
      title: 'Section.80',
      year: 2011,
      primaryType: 'Album',
      secondaryTypes: [],
    },
  ],
  recordingCount: {
    value: 143,
    source: 'MusicBrainz stored snapshot',
    sourceUrl: musicBrainzArtist,
    retrievedAt,
    confidence: 'medium',
    method: 'calculated',
    note: 'Normalized development fixture after de-duplication; verify against a live provider refresh before relying on the count.',
  },
  weightedCatalogAge: {
    value: 8.6,
    source: 'Catalog Underwriter normalization',
    sourceUrl: musicBrainzArtist,
    retrievedAt,
    confidence: 'medium',
    method: 'calculated',
  },
  tracks: [
    track(
      'not-like-us',
      'Not Like Us',
      18,
      'Global chart and official-stream signal',
    ),
    track('humble', 'HUMBLE.', 14, 'Top-track demand signal'),
    track('money-trees', 'Money Trees', 11, 'Top-track demand signal'),
    track('all-the-stars', 'All the Stars', 9, 'Top-track demand signal'),
    track('dna', 'DNA.', 8, 'Top-track demand signal'),
    track(
      'swimming-pools',
      'Swimming Pools (Drank)',
      7,
      'Top-track demand signal',
    ),
    track('luther', 'luther', 6, 'Recent chart demand signal'),
    track('maad-city', 'm.A.A.d city', 5, 'Top-track demand signal'),
    track(
      'bitch-dont-kill-my-vibe',
      "Bitch, Don't Kill My Vibe",
      4,
      'Top-track demand signal',
    ),
    track('tv-off', 'tv off', 3, 'Recent chart demand signal'),
    track('long-tail', 'Remaining catalog', 15, 'Aggregated long-tail demand'),
  ],
  coverage: [
    {
      label: 'Release metadata',
      level: 'High',
      detail: 'MusicBrainz structure is available in the stored snapshot.',
    },
    {
      label: 'Public performance',
      level: 'Moderate',
      detail:
        'Relative-demand observations are available; platform-level completeness is limited.',
    },
    {
      label: 'Ownership data',
      level: 'Low',
      detail:
        'No contracts or royalty statements are public. All rights inputs are assumptions.',
    },
    {
      label: 'Historic revenue',
      level: 'Not public',
      detail: 'The model does not claim access to private royalty income.',
    },
    {
      label: 'Normalized cash flow',
      level: 'Moderate',
      detail:
        'Stored illustrative range from versioned public-demand calibration; not observed earnings.',
    },
  ],
  publicCashFlowEstimate: {
    low: 4_800_000,
    midpoint: 6_200_000,
    high: 7_100_000,
    confidence: 'low',
    methodologyVersion: 'public-underwrite-1.0.0',
    inputs: [
      {
        label: 'Stored public-demand fixture',
        value: 'Normalized development snapshot',
        method: 'observed',
        source: 'Catalog Underwriter stored fixture',
      },
      {
        label: 'Calibration anchor',
        value: 'Versioned public-demand model',
        method: 'assumption',
      },
    ],
    note: 'Illustrative range derived from a stored, normalized public-signal fixture and explicit calibration assumptions—not observed artist earnings or a direct platform payout.',
    retrievedAt,
  },
};
