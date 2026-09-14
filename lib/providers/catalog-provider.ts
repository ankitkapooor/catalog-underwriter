import type {
  ArtistSearchResult,
  CatalogSnapshot,
  EstimateRange,
  YouTubeVideoEvidence,
} from '@/types/catalog';

export type LastFmTrackSignal = {
  name: string;
  playcount: number;
  listeners: number;
  sourceUrl: string;
};

export type ChartCertificationEvidence = {
  title: string;
  territory: string;
  level: string;
  date: string | null;
  sourceUrl: string;
};

export interface CatalogProvider {
  searchArtist(query: string): Promise<ArtistSearchResult[]>;
  getArtistCatalog(id: string): Promise<CatalogSnapshot>;
}

export type MusicBrainzProvider = CatalogProvider;

export interface LastFmProvider {
  getTopTrackSignals(artistName: string): Promise<LastFmTrackSignal[]>;
}

export interface YouTubeDataProvider {
  getOfficialVideoEvidence(artistName: string): Promise<YouTubeVideoEvidence[]>;
}

export interface StreamingScaleProvider {
  getAnnualAudioStreamingEstimate(
    artistName: string,
  ): Promise<EstimateRange | null>;
}

export interface ChartCertificationProvider {
  getChartCertificationEvidence(
    artistName: string,
  ): Promise<ChartCertificationEvidence[]>;
}

export type PerformanceProvider = LastFmProvider;
