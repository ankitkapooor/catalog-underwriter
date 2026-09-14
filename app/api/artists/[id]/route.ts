import { LastFmPerformanceProvider } from '@/lib/providers/lastfm';
import { MusicBrainzCatalogProvider } from '@/lib/providers/musicbrainz';
import { allowRequest } from '@/lib/server/rate-limit';
import type { TrackEvidence } from '@/types/catalog';

const MUSICBRAINZ_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const client =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for') ??
    'local';

  if (!allowRequest(`artist-detail:${client}`, 20)) {
    return Response.json(
      {
        error: 'Too many catalog requests. Please wait a minute and try again.',
      },
      { status: 429 },
    );
  }
  if (!MUSICBRAINZ_ID.test(id)) {
    return Response.json(
      { error: 'The selected artist identifier is invalid.' },
      { status: 400 },
    );
  }

  try {
    const catalog = await new MusicBrainzCatalogProvider().getArtistCatalog(id);
    const lastFmApiKey = process.env.LASTFM_API_KEY;

    if (lastFmApiKey) {
      try {
        const signals = await new LastFmPerformanceProvider(
          lastFmApiKey,
        ).getTopTrackSignals(catalog.artist.name);
        const total = signals.reduce((sum, track) => sum + track.playcount, 0);
        const retrievedAt = new Date().toISOString();
        catalog.tracks = signals.map<TrackEvidence>((track, index) => ({
          id: `lastfm-${index}`,
          title: track.name,
          demandShare: total > 0 ? (track.playcount / total) * 100 : 0,
          observedMetric: `${track.playcount.toLocaleString('en-US')} Last.fm scrobbles`,
          source: {
            value: `${track.playcount} scrobbles; ${track.listeners} listeners`,
            source: 'Last.fm artist top tracks',
            sourceUrl: track.sourceUrl,
            retrievedAt,
            confidence: 'medium',
            method: 'observed',
            note: 'Used only for relative demand and concentration—not as a direct revenue measure.',
          },
        }));
        catalog.coverage[1] = {
          label: 'Public performance',
          level: signals.length ? 'Moderate' : 'Unavailable',
          detail: signals.length
            ? `${signals.length} Last.fm track observations support relative demand analysis.`
            : 'Last.fm returned no top-track observations.',
        };
      } catch {
        catalog.coverage[1] = {
          label: 'Public performance',
          level: 'Unavailable',
          detail:
            'Last.fm was unavailable. The catalog still loads from MusicBrainz; no replacement data was fabricated.',
        };
      }
    }

    return Response.json({ catalog });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Catalog data is temporarily unavailable.',
      },
      { status: 503 },
    );
  }
}
