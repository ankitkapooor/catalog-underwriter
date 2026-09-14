import type { ArtistSearchResult, CatalogSnapshot } from '@/types/catalog';

export interface CatalogProvider {
  searchArtist(query: string): Promise<ArtistSearchResult[]>;
  getArtistCatalog(id: string): Promise<CatalogSnapshot>;
}

export interface PerformanceProvider {
  getTopTrackSignals(artistName: string): Promise<
    Array<{
      name: string;
      playcount: number;
      listeners: number;
      sourceUrl: string;
    }>
  >;
}
