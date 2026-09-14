import { MusicBrainzCatalogProvider } from '@/lib/providers/musicbrainz';
import { allowRequest } from '@/lib/server/rate-limit';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get('q') ?? '').trim();
  const client =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for') ??
    'local';

  if (!allowRequest(`artist-search:${client}`, 15)) {
    return Response.json(
      {
        error: 'Too many artist searches. Please wait a minute and try again.',
      },
      { status: 429 },
    );
  }
  if (query.length < 2 || query.length > 80) {
    return Response.json(
      { error: 'Enter an artist name between 2 and 80 characters.' },
      { status: 400 },
    );
  }

  try {
    const provider = new MusicBrainzCatalogProvider();
    const artists = await provider.searchArtist(query);
    return Response.json({
      artists,
      source: 'MusicBrainz',
      retrievedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Artist search is temporarily unavailable.',
      },
      { status: 503 },
    );
  }
}
