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
    body: 'MusicBrainz provides catalog evidence: canonical artist identity, release groups, dates, types, and genre metadata. Last.fm supplies cumulative scrobbles and listener counts as demand evidence. When configured, YouTube supplies cumulative views for conservatively matched official music videos, official audio, and artist-topic uploads.',
  },
  {
    number: '02',
    title: 'What remains unavailable',
    body: 'Royalty statements, private ownership contracts, annual platform consumption, recoupment positions, negotiated distribution terms, and buyer bids are generally not public. The application labels those fields as unknown or user assumptions; it never treats missing information as zero and never annualizes cumulative observations silently.',
  },
  {
    number: '03',
    title: 'Catalog normalization',
    body: 'The economic model distinguishes compositions, recordings, and commercial releases. The current live provider returns release groups and removes identical identifiers. The stored fixture applies a deeper development normalization; recording-level live normalization is intentionally marked incomplete.',
  },
  {
    number: '04',
    title: 'Observed consumption',
    body: 'Last.fm observations support relative artist scale, track concentration, breadth, long-tail strength, and persistence. YouTube view counts add another cumulative demand signal. Both are explicitly labeled cumulative observations; neither is an annual stream count, royalty statement, or cash-flow estimate.',
  },
  {
    number: '05',
    title: 'Modeled consumption',
    body: 'The PublicConsumptionEstimate layer is reserved for defensible current annual/run-rate observations or a disclosed modeled annualization. Cumulative Last.fm and YouTube totals remain separate and cannot populate annual audio or video ranges by themselves. When annualization evidence is missing, those ranges stay unavailable.',
  },
  {
    number: '06',
    title: 'Economic assumptions and cash flow',
    body: 'RightsEconomics is a separate bridge from annual consumption to estimated annual rights revenue. It models audio streaming, YouTube, publishing, and other categories separately under editable low, base, and high assumptions. It makes no fixed Spotify payout claim. Without annual consumption and complete economic assumptions, automatic cash flow stays unavailable and the user may enter a manual normalized annual cash flow.',
  },
  {
    number: '07',
    title: 'Valuation',
    body: 'The deterministic DCF projects annual cash flow for ten explicit years and discounts each year at the selected risk rate. A separate market approach multiplies normalized annual cash flow by an editable multiple whose starting range is derived from curated transactions with disclosed income multiples.',
  },
  {
    number: '08',
    title: 'Reconciliation',
    body: 'The interface shows DCF value, market-multiple value, and a reconciled indicative range. The range spans the selected DCF result and the transaction-derived market band; it is not a mechanical average. Rights scope and evidence quality still require underwriting judgment.',
  },
  {
    number: '09',
    title: 'Comparable transactions',
    body: 'The repository-managed dataset links to transaction reports and labels rights scope, confidence, comparability, and disclosed income-multiple basis. Benchmarks are validation data, never targets for fitting Last.fm to sale price. Missing prices and multiples remain undisclosed.',
  },
  {
    number: '10',
    title: 'What the model cannot know',
    body: 'The evidence chain is kept explicit: observed consumption → modeled consumption → economic assumption → estimated cash flow → valuation. This tool cannot determine actual artist income, legal ownership, contractual restrictions, future cultural relevance, or a definitive market-clearing bid. It supports judgment; it does not replace diligence, legal advice, or verified financial statements.',
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
              href="https://developers.google.com/youtube/v3/docs/videos/list"
              target="_blank"
              rel="noreferrer"
            >
              YouTube Data API <ExternalLink className="size-3" />
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
