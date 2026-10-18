import type { LastFmProvider, LastFmTrackSignal } from './catalog-provider';

// Wide enough for concentration and long-tail analysis without paging.
export const LASTFM_TOP_TRACK_LIMIT = 500;

type TopTracksResponse = {
  error?: number;
  toptracks?: {
    track?: Array<{
      name: string;
      playcount: string;
      listeners: string;
      url: string;
    }>;
  };
};

export class LastFmPerformanceProvider implements LastFmProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Looks the artist up by MusicBrainz ID first. Name lookups with
   * autocorrect can land on the wrong artist (MusicBrainz's "Ye" autocorrects
   * to the band Yes), so the name is only a fallback.
   */
  async getTopTrackSignals(
    artistName: string,
    musicBrainzId?: string,
  ): Promise<LastFmTrackSignal[]> {
    if (musicBrainzId) {
      const byId = await this.fetchTopTracks({ mbid: musicBrainzId }).catch(
        () => [],
      );
      if (byId.length) return byId;
    }
    return this.fetchTopTracks({ artist: artistName, autocorrect: '1' });
  }

  private async fetchTopTracks(
    lookup: Record<string, string>,
  ): Promise<LastFmTrackSignal[]> {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method', 'artist.gettoptracks');
    for (const [key, value] of Object.entries(lookup)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', String(LASTFM_TOP_TRACK_LIMIT));

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Last.fm returned ${response.status}.`);
    const data = (await response.json()) as TopTracksResponse;
    if (data.error) throw new Error(`Last.fm returned error ${data.error}.`);

    return (data.toptracks?.track ?? []).map((track) => ({
      name: track.name,
      playcount: Number(track.playcount) || 0,
      listeners: Number(track.listeners) || 0,
      sourceUrl: track.url,
    }));
  }
}
