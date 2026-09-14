'use client';

import { type SyntheticEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="self-end border-t-2 border-ink pt-5">
      <form onSubmit={search}>
        <label htmlFor="artist-search" className="eyebrow text-foreground">
          Begin an underwrite
        </label>
        <div className="mt-3 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="artist-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-12 rounded-none border-ink/25 bg-white pl-10 text-base shadow-none focus-visible:border-accent focus-visible:ring-accent/15"
              placeholder="Search an artist…"
              autoComplete="off"
            />
          </div>
          <Button
            disabled={status === 'loading'}
            type="submit"
            className="h-12 rounded-none bg-ink px-4 text-paper hover:bg-accent"
          >
            {status === 'loading' ? 'Resolving…' : 'Search'}{' '}
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
            <ul className="mt-3 max-h-72 divide-y divide-ink/15 overflow-y-auto border-y border-ink/20 bg-paper">
              {results.map((artist) => (
                <li key={artist.musicBrainzId}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-4 px-2 py-3 text-left transition-colors hover:bg-secondary/70 focus-visible:bg-secondary/70"
                    onClick={() =>
                      router.push(`/artist/${artist.musicBrainzId}/underwrite`)
                    }
                  >
                    <span>
                      <span className="block font-semibold">{artist.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {[artist.type, artist.country, artist.disambiguation]
                          .filter(Boolean)
                          .join(' · ') || 'No disambiguation available'}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {artist.score}% match
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="mt-3 text-sm text-muted-foreground">
        Or explore the stored{' '}
        <button
          type="button"
          className="underline underline-offset-4 hover:text-foreground"
          onClick={() => router.push('/artist/demo/underwrite')}
        >
          Kendrick Lamar demo
        </button>
        .
      </p>
    </div>
  );
}
