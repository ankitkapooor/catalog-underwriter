import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import {
  METHODOLOGY_VERSION,
  VALUATION_ENGINE_VERSION,
} from '@/config/valuation-defaults';

const sections = [
  {
    number: '01',
    title: 'What the model collects',
    body: 'MusicBrainz provides canonical artist identity, release groups, dates, types, and genre metadata. An optional server-side Last.fm adapter supplies top-track scrobbles and listener counts for relative-demand analysis. A stored demonstration snapshot keeps the core experience available when a provider is down.',
  },
  {
    number: '02',
    title: 'What remains unavailable',
    body: 'Royalty statements, private ownership contracts, platform-level revenue, recoupment positions, negotiated distribution terms, and buyer bids are generally not public. The application labels those fields as unknown or user assumptions; it never treats missing information as zero.',
  },
  {
    number: '03',
    title: 'Catalog normalization',
    body: 'The economic model distinguishes compositions, recordings, and commercial releases. The current live provider returns release groups and removes identical identifiers. The stored fixture applies a deeper development normalization; recording-level live normalization is intentionally marked incomplete.',
  },
  {
    number: '04',
    title: 'Public performance',
    body: 'Performance sources remain separate dimensions. Last.fm observations are used to estimate relative track concentration—not as a per-play royalty rate and not as a substitute for Spotify, YouTube, or royalty-accounting data.',
  },
  {
    number: '05',
    title: 'Cash-flow reconstruction',
    body: 'The stored demo presents a low–midpoint–high annual economic cash-flow range calibrated from its saved public-signal fixture. The live estimator (public-cash-flow-1.0.0) requires at least three valid top-track observations, 100,000 aggregate playcounts, 10,000 peak listeners, and one release group. It anchors $250,000 to 25 million playcounts, one million peak listeners, and 12 release groups, with playcount/listener elasticities of 0.55/0.25. Coverage uses a 25-track target and 0.55 floor; release breadth is sqrt(releases/12), bounded 0.6–1.4; age is neutral at 10 years with a 1% per-year slope, bounded 0.85–1.15. Range uncertainty starts at 0.15, adds 0.35 for missing coverage and 0.30 times top-five concentration. Base low/high multipliers are 0.80/1.25, adjusted within 0.25–0.70 and 1.40–2.50; total cash flow is bounded at $25,000/$50,000,000. These are demand proxies—not royalty rates or lifetime catalog totals. The range is inferred, not observed earnings; insufficient live evidence requires a known or hypothetical cash-flow entry.',
  },
  {
    number: '06',
    title: 'Economic rights',
    body: 'Master and publishing interests are weighted by the modeled revenue mix. Songwriter participation affects the publishing portion, then administration and distribution fees reduce the combined interest. Defaults are editable assumptions and never ownership claims.',
  },
  {
    number: '07',
    title: 'Discounted cash flow',
    body: 'The engine projects annual cash flow for ten explicit years. Years one through five use the near-term growth or decay rate; years six through ten use the mature rate. Each year is discounted at the base discount rate plus any user-selected concentration premium.',
  },
  {
    number: '08',
    title: 'Terminal value',
    body: 'The MVP uses a Gordon-growth perpetuity after year ten. Terminal growth must stay below the effective discount rate; invalid configurations are rejected. The interface separates terminal value so users can see how much of the price rests on distant assumptions.',
  },
  {
    number: '09',
    title: 'Comparable transactions',
    body: 'The repository-managed dataset links to original announcements and separate price reports when necessary. Transactions are labeled partially comparable or context only because rights scope, earnings, and private terms differ. Missing prices and multiples remain undisclosed.',
  },
  {
    number: '10',
    title: 'What the model cannot know',
    body: 'This tool cannot determine actual artist income, legal ownership, contractual restrictions, future cultural relevance, or a definitive market-clearing bid. It supports an investment judgment; it does not replace diligence, legal advice, or verified financial statements.',
  },
];

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-paper">
      <header className="border-b border-ink/15">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-semibold"
          >
            <ArrowLeft className="size-4" /> Catalog Underwriter
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            {METHODOLOGY_VERSION}
          </span>
        </div>
      </header>

      <article className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-18">
        <div className="grid gap-8 border-b-2 border-ink pb-10 lg:grid-cols-[1fr_.65fr]">
          <div>
            <p className="eyebrow">Model notes</p>
            <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.04em] sm:text-7xl">
              Methodology before output.
            </h1>
          </div>
          <div className="self-end">
            <p className="text-lg leading-8 text-muted-foreground">
              Catalog Underwriter starts with observable evidence, identifies
              what is missing, and exposes every material valuation assumption.
              The financial engine is deterministic.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-ink/15 pt-4 text-sm">
              <div>
                <dt className="eyebrow">Methodology</dt>
                <dd className="mt-1">{METHODOLOGY_VERSION}</dd>
              </div>
              <div>
                <dt className="eyebrow">Engine</dt>
                <dd className="mt-1">{VALUATION_ENGINE_VERSION}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="divide-y divide-ink/15">
          {sections.map((section) => (
            <section
              className="grid gap-4 py-8 sm:grid-cols-[80px_280px_1fr] sm:py-10"
              key={section.number}
            >
              <p className="font-mono text-xs text-accent">{section.number}</p>
              <h2 className="font-display text-2xl font-semibold">
                {section.title}
              </h2>
              <p className="max-w-2xl leading-7 text-muted-foreground">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <aside className="mt-8 border-y-2 border-ink py-7">
          <p className="eyebrow">Primary public sources</p>
          <div className="mt-4 flex flex-wrap gap-5 text-sm">
            <a
              className="inline-flex items-center gap-1 underline underline-offset-4"
              href="https://musicbrainz.org/doc/MusicBrainz_API"
              target="_blank"
              rel="noreferrer"
            >
              MusicBrainz API <ExternalLink className="size-3" />
            </a>
            <a
              className="inline-flex items-center gap-1 underline underline-offset-4"
              href="https://www.last.fm/api/show/artist.getTopTracks"
              target="_blank"
              rel="noreferrer"
            >
              Last.fm top tracks <ExternalLink className="size-3" />
            </a>
            <a
              className="inline-flex items-center gap-1 underline underline-offset-4"
              href="https://www.sonymusic.com/sonymusic/smg-announces-acquisition-of-bruce-springsteens-music/"
              target="_blank"
              rel="noreferrer"
            >
              Sony transaction announcement <ExternalLink className="size-3" />
            </a>
          </div>
        </aside>

        <p className="mt-7 text-xs leading-5 text-muted-foreground">
          Catalog Underwriter is an educational analytical tool. Estimates are
          not verified royalty statements, ownership interests, market offers,
          investment advice, or legal advice.
        </p>
      </article>
    </main>
  );
}
