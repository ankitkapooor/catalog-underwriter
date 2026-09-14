import type { LastFmProvider } from './catalog-provider';

export class LastFmPerformanceProvider implements LastFmProvider {
  constructor(private readonly apiKey: string) {}

  async getTopTrackSignals(artistName: string) {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method', 'artist.gettoptracks');
    url.searchParams.set('artist', artistName);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '25');
    url.searchParams.set('autocorrect', '1');

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`Last.fm returned ${response.status}.`);
    const data = (await response.json()) as {
      toptracks?: {
        track?: Array<{
          name: string;
          playcount: string;
          listeners: string;
          url: string;
        }>;
      };
    };

    return (data.toptracks?.track ?? []).map((track) => ({
      name: track.name,
      playcount: Number(track.playcount) || 0,
      listeners: Number(track.listeners) || 0,
      sourceUrl: track.url,
    }));
  }
}
