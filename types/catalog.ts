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
  observationTiming: ObservationTiming;
  lastFmPlaycount?: number;
  lastFmListeners?: number;
  observedMetric?: string;
  source: SourcedValue<string>;
};

export type ObservationTiming =
  | 'current-annual-run-rate'
  | 'cumulative-observation'
  | 'modeled-annualization';

export type EvidenceLayer =
  | 'observed-consumption'
  | 'modeled-consumption'
  | 'economic-assumption'
  | 'estimated-cash-flow'
  | 'valuation';

export type ModelInput = {
  label: string;
  value: string;
  method: 'observed' | 'calculated' | 'assumption';
  layer?: EvidenceLayer;
  observationTiming?: ObservationTiming;
  source?: string;
  note?: string;
};

export type PublicCashFlowModelInput = ModelInput;

export type EstimateRange = {
  low: number;
  midpoint: number;
  high: number;
};

export type PublicCashFlowEstimate = {
  low: number;
  midpoint: number;
  high: number;
  confidence: Confidence;
  methodologyVersion: string;
  inputs: PublicCashFlowModelInput[];
  note: string;
  retrievedAt: string;
};

export type YouTubeVideoEvidence = {
  videoId: string;
  channelId: string;
  channelTitle: string;
  title: string;
  viewCount: number;
  publicationDate: string;
  evidenceType:
    | 'official-music-video'
    | 'official-audio'
    | 'artist-topic-upload';
  matchingConfidence: Confidence;
  observationTiming: 'cumulative-observation';
  sourceUrl: string;
};

export type AnnualizedConsumptionEvidence = {
  range: EstimateRange;
  observationTiming: 'current-annual-run-rate' | 'modeled-annualization';
  methodology: string;
  source?: string;
};

export type PublicConsumptionEstimate = {
  audioStreamingEquivalent: EstimateRange | null;
  youtubeAnnualViews: EstimateRange | null;
  confidence: Confidence;
  inputs: ModelInput[];
  methodologyVersion: string;
  retrievedAt: string;
  note: string;
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
  youtubeVideos: YouTubeVideoEvidence[];
  coverage: CoverageItem[];
  publicConsumptionEstimate: PublicConsumptionEstimate | null;
  publicCashFlowEstimate: PublicCashFlowEstimate | null;
};
