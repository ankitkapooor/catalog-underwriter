'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CatalogArtwork } from '@/components/underwrite/catalog-artwork';
import type { ArtistSearchResult } from '@/types/catalog';

export function ArtistSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'results' | 'empty' | 'error'
  >('idle');
  const [message, setMessage] = useState('');

  async function search(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = query.trim();
    if (cleaned.length < 2) {
      setStatus('error');
      setMessage(
        'Enter at least two characters so the public catalog can be resolved.',
      );
      return;
    }

    setStatus('loading');
    setResults([]);
    setMessage('Resolving artist identity through MusicBrainz…');
    try {
      const response = await fetch(
        `/api/artists/search?q=${encodeURIComponent(cleaned)}`,
      );
      const data = (await response.json()) as {
        artists?: ArtistSearchResult[];
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error ?? 'Artist search is unavailable.');
      const artists = data.artists ?? [];
      setResults(artists);
      setStatus(artists.length ? 'results' : 'empty');
      setMessage(
        artists.length
          ? 'Choose the correct public identity before underwriting.'
          : 'No matching artist was found. Try a fuller name.',
      );
    } catch (error) {
      setStatus('error');
      setMessage(
        error instanceof Error
          ? error.message
          : 'Artist search is temporarily unavailable.',
      );
    }
  }

  return (
    <div className="min-w-0 rounded-[18px] border border-border bg-card p-5">
      <form onSubmit={search}>
        <label htmlFor="artist-search" className="text-sm font-semibold">
          Begin an underwrite
        </label>
        <div className="mt-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="artist-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 rounded-full border-transparent bg-secondary pl-10 text-base shadow-none focus-visible:border-accent focus-visible:bg-card focus-visible:ring-accent/15"
              placeholder="Search artists"
              autoComplete="off"
            />
          </div>
          <Button
            disabled={status === 'loading'}
            type="submit"
            className="h-11 rounded-full bg-foreground px-5 text-background hover:bg-accent"
          >
            {status === 'loading' ? 'Resolving…' : 'Search'}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </form>

      {status !== 'idle' && (
        <div className="mt-4" aria-live="polite">
          <p
            className={`text-sm ${status === 'error' ? 'text-negative' : 'text-muted-foreground'}`}
          >
            {message}
          </p>
          {results.length > 0 && (
            <ul className="mt-2 max-h-80 overflow-y-auto">
              {results.map((artist) => (
                <li key={artist.musicBrainzId}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary focus-visible:bg-secondary"
                    onClick={() =>
                      router.push(`/artist/${artist.musicBrainzId}/underwrite`)
                    }
                  >
                    <CatalogArtwork name={artist.name} size="small" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {artist.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {[artist.type, artist.country, artist.disambiguation]
                          .filter(Boolean)
                          .join(' · ') || 'No disambiguation available'}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {artist.score}% match
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-4 text-sm text-muted-foreground">
        Or open the{' '}
        <button
          type="button"
          className="font-medium text-foreground underline underline-offset-4 hover:text-accent"
          onClick={() => router.push('/artist/demo/underwrite')}
        >
          Kendrick Lamar demo
        </button>
        .
      </p>
    </div>
  );
}
