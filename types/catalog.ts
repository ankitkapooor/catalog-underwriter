export type Confidence = 'high' | 'medium' | 'low';
export type SourceMethod =
  | 'reported'
  | 'observed'
  | 'calculated'
  | 'estimated'
  | 'user-entered';

export type SourcedValue<T> = {
  value: T | null;
  source: string;
  sourceUrl?: string;
  retrievedAt: string;
  confidence: Confidence;
  method: SourceMethod;
  note?: string;
};

export type ArtistSearchResult = {
  musicBrainzId: string;
  name: string;
  sortName?: string;
  country?: string;
  disambiguation?: string;
  type?: string;
  score: number;
};

export type CatalogRelease = {
  id: string;
  title: string;
  year: number | null;
  primaryType: string;
  secondaryTypes: string[];
};

export type TrackEvidence = {
  id: string;
  title: string;
  demandShare: number;
  observedMetric?: string;
  source: SourcedValue<string>;
};

export type CoverageItem = {
  label: string;
  level: 'High' | 'Moderate' | 'Low' | 'Not public' | 'Unavailable';
  detail: string;
};

export type CatalogSnapshot = {
  snapshotId: string;
  snapshotLabel: string;
  isStoredDemo: boolean;
  artist: ArtistSearchResult;
  retrievedAt: string;
  activeYears?: string;
  genres: string[];
  releases: CatalogRelease[];
  recordingCount: SourcedValue<number>;
  weightedCatalogAge: SourcedValue<number>;
  tracks: TrackEvidence[];
  coverage: CoverageItem[];
  publicCashFlowEstimate: {
    low: number;
    midpoint: number;
    high: number;
    methodologyVersion: string;
    note: string;
  } | null;
};
