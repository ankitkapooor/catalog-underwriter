import type { YouTubeVideoEvidence } from '../../types/catalog.ts';
import type { YouTubeDataProvider } from './catalog-provider.ts';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const MAX_SEARCH_RESULTS = 25;

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
  }>;
};

type YouTubeVideosResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelId?: string;
      channelTitle?: string;
      publishedAt?: string;
    };
    statistics?: { viewCount?: string };
  }>;
};

const normalize = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();

function classifyOfficialVideo(
  artistName: string,
  title: string,
  channelTitle: string,
): Pick<YouTubeVideoEvidence, 'evidenceType' | 'matchingConfidence'> | null {
  const artist = normalize(artistName);
  const normalizedTitle = normalize(title);
  const channel = normalize(channelTitle);
  const compactArtist = artist.replaceAll(' ', '');
  const compactChannel = channel.replaceAll(' ', '');
  const titleMatchesArtist = normalizedTitle.includes(artist);
  const channelMatchesArtist =
    channel.includes(artist) || compactChannel.includes(compactArtist);
  const isTopicChannel =
    channel === `${artist} topic` ||
    (channel.endsWith(' topic') && channelMatchesArtist);
  const isVevoChannel = channelMatchesArtist && channel.includes('vevo');
  const isOfficialArtistChannel =
    channelMatchesArtist && channel.includes('official');
  const isOfficialVideo = normalizedTitle.includes('official video');
  const isOfficialAudio = normalizedTitle.includes('official audio');
  const isFanOrDerivative =
    normalizedTitle.includes('reaction') ||
    normalizedTitle.includes('fan made') ||
    normalizedTitle.includes('cover by') ||
    normalizedTitle.includes('sped up') ||
    normalizedTitle.includes('slowed reverb');

  if (isFanOrDerivative) return null;
  if (isTopicChannel) {
    return {
      evidenceType: 'artist-topic-upload',
      matchingConfidence: 'high',
    };
  }
  if (
    titleMatchesArtist &&
    (isVevoChannel || isOfficialArtistChannel) &&
    (isOfficialVideo || isOfficialAudio)
  ) {
    return {
      evidenceType: isOfficialAudio ? 'official-audio' : 'official-music-video',
      matchingConfidence: 'high',
    };
  }
  if (
    titleMatchesArtist &&
    channelMatchesArtist &&
    (isOfficialVideo || isOfficialAudio)
  ) {
    return {
      evidenceType: isOfficialAudio ? 'official-audio' : 'official-music-video',
      matchingConfidence: 'medium',
    };
  }
  return null;
}

export class YouTubeDataApiProvider implements YouTubeDataProvider {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 86_400 },
    } as RequestInit & { next: { revalidate: number } });
    if (!response.ok) throw new Error(`YouTube returned ${response.status}.`);
    return response.json() as Promise<T>;
  }

  async getOfficialVideoEvidence(
    artistName: string,
  ): Promise<YouTubeVideoEvidence[]> {
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('maxResults', String(MAX_SEARCH_RESULTS));
    searchUrl.searchParams.set('q', `${artistName} official music`);
    searchUrl.searchParams.set('key', this.apiKey);

    const search = await this.fetchJson<YouTubeSearchResponse>(searchUrl);
    const videoIds = (search.items ?? [])
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));
    if (!videoIds.length) return [];

    const videosUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
    videosUrl.searchParams.set('part', 'snippet,statistics');
    videosUrl.searchParams.set('id', videoIds.join(','));
    videosUrl.searchParams.set('key', this.apiKey);

    const videos = await this.fetchJson<YouTubeVideosResponse>(videosUrl);
    return (videos.items ?? []).flatMap((video) => {
      const videoId = video.id;
      const title = video.snippet?.title;
      const channelId = video.snippet?.channelId;
      const channelTitle = video.snippet?.channelTitle;
      const publicationDate = video.snippet?.publishedAt;
      const viewCount = Number(video.statistics?.viewCount);
      if (
        !videoId ||
        !title ||
        !channelId ||
        !channelTitle ||
        !publicationDate ||
        !Number.isFinite(viewCount) ||
        viewCount < 0
      ) {
        return [];
      }

      const classification = classifyOfficialVideo(
        artistName,
        title,
        channelTitle,
      );
      if (!classification) return [];

      return [
        {
          videoId,
          channelId,
          channelTitle,
          title,
          viewCount,
          publicationDate,
          ...classification,
          observationTiming: 'cumulative-observation' as const,
          sourceUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`,
        },
      ];
    });
  }
}

export { classifyOfficialVideo };
