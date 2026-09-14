import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ArtistSearch } from '@/components/artist-search';
import { defaultValuationAssumptions } from '@/config/valuation-defaults';
import { demoCatalog } from '@/data/demo-catalog';
import { calculateConcentration } from '@/lib/valuation/concentration';
import { calculateScenarios } from '@/lib/valuation/scenarios';

const scenarios = calculateScenarios(defaultValuationAssumptions);
const concentration = calculateConcentration(
  demoCatalog.tracks.map((track) => track.demandShare),
);
const money = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
const evidence = [
  [
    'Identified recordings',
    demoCatalog.recordingCount.value?.toString() ?? 'Unknown',
  ],
  ['Weighted catalog age', `${demoCatalog.weightedCatalogAge.value} yrs`],
  ['Top-10 concentration', `${Math.round(concentration.topTenShare * 100)}%`],
  ['Evidence coverage', 'Moderate'],
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-ink/15 bg-paper/95">
        <div className="mx-auto flex min-h-16 max-w-[1500px] items-center justify-between gap-5 px-5 sm:px-8">
          <Link
            href="/"
            className="font-display text-xl font-semibold tracking-tight"
          >
            Catalog Underwriter
          </Link>
          <nav
            aria-label="Primary navigation"
            className="flex items-center gap-5 text-sm text-muted-foreground"
          >
            <Link
              className="transition-colors hover:text-foreground"
              href="/methodology"
            >
              Methodology
            </Link>
            <span className="hidden border-l border-ink/15 pl-5 font-mono text-xs uppercase tracking-[0.14em] sm:inline">
              Model v1.0
            </span>
          </nav>
        </div>
      </header>

      <section className="border-b border-ink/15 bg-paper">
        <div className="mx-auto grid max-w-[1500px] gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)] lg:py-18">
          <div>
            <p className="eyebrow">Public-data underwriting workbench</p>
            <h1 className="mt-5 max-w-3xl font-display text-5xl leading-[0.96] font-semibold tracking-[-0.045em] sm:text-7xl">
              What would you pay for the music?
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Search an artist, reconstruct the observable catalog, and
              challenge the assumptions that turn demand into value.
            </p>
          </div>

          <ArtistSearch />
        </div>
      </section>

      <section
        aria-labelledby="snapshot-title"
        className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 lg:py-14"
      >
        <div className="mb-5 flex items-end justify-between border-b border-ink/20 pb-3">
          <div>
            <p className="eyebrow">Stored demonstration snapshot</p>
            <h2
              id="snapshot-title"
              className="mt-2 font-display text-3xl font-semibold tracking-tight"
            >
              Kendrick Lamar
            </h2>
          </div>
          <p className="hidden font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground sm:block">
            Evidence as of 14 Sep 2026
          </p>
        </div>

        <div className="grid border-b border-ink/20 lg:grid-cols-[1.15fr_1fr]">
          <div className="border-ink/20 py-8 lg:border-r lg:pr-10">
            <p className="eyebrow">Indicative catalog interest value</p>
            <div className="mt-3 flex items-end gap-4">
              <p className="financial-value">
                {money(scenarios.base.catalogValue)}
              </p>
              <span className="mb-2 border border-positive/35 bg-positive/8 px-2 py-1 font-mono text-xs uppercase tracking-[0.1em] text-positive">
                Base case
              </span>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-px border-y border-ink/15 bg-ink/15">
              {[
                ['Bear', money(scenarios.bear.catalogValue)],
                ['Base', money(scenarios.base.catalogValue)],
                ['Bull', money(scenarios.bull.catalogValue)],
              ].map(([label, value]) => (
                <div className="bg-background py-4 pr-3" key={label}>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-ink/15 lg:ml-10">
            {evidence.map(([label, value]) => (
              <div className="bg-background p-5" key={label}>
                <p className="font-display text-2xl font-semibold">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Educational analysis based on public evidence and editable
            assumptions—not verified royalty income, ownership, investment
            advice, or legal advice.
          </p>
          <Link
            href="/artist/demo/underwrite"
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-ink focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open the underwrite{' '}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
