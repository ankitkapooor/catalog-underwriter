import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { ArtistSearch } from '@/components/artist-search';
import { CatalogArtwork } from '@/components/underwrite/catalog-artwork';
import { count, money, percent } from '@/components/underwrite/format';
import {
  defaultValuationAssumptions,
  METHODOLOGY_VERSION,
} from '@/config/valuation-defaults';
import { demoCatalog } from '@/data/demo-catalog';
import { calculateConcentration } from '@/lib/valuation/concentration';
import { calculateEconomicRightsShare } from '@/lib/valuation/dcf';
import { calculateScenarios } from '@/lib/valuation/scenarios';

// The homepage values the stored demo exactly as the demo underwrite does:
// its modeled cash flow under the default valuation assumptions.
function storedDemoCashFlow() {
  const estimate = demoCatalog.publicCashFlowEstimate;
  if (!estimate) {
    throw new Error(
      'The stored demo snapshot must produce a modeled cash flow.',
    );
  }
  return estimate;
}
const demoCashFlow = storedDemoCashFlow();
const demoAssumptions = {
  ...defaultValuationAssumptions,
  normalizedCashFlow: demoCashFlow.midpoint,
  masterRevenueMix:
    demoCashFlow.masterRevenueMix ??
    defaultValuationAssumptions.masterRevenueMix,
};
const scenarios = calculateScenarios(demoAssumptions);
const buyerShare = calculateEconomicRightsShare(demoAssumptions);
const concentration = calculateConcentration(
  demoCatalog.tracks.map((track) => track.demandShare),
);
const listening =
  (demoCatalog.publicConsumptionEstimate?.audioStreamingEquivalent?.midpoint ??
    0) +
  (demoCatalog.publicConsumptionEstimate?.youtubeAnnualViews?.midpoint ?? 0);
const evidenceDate = new Date(demoCatalog.retrievedAt).toLocaleDateString(
  'en-GB',
  { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' },
);
const flow = [
  ['Listening a year', count(listening), 'streams and views'],
  ['Modeled cash flow', money(demoCashFlow.midpoint), 'a year, all rights'],
  [
    'Your share',
    money(demoCashFlow.midpoint * buyerShare),
    `${percent(buyerShare, 0)} after fees`,
  ],
  [
    'Worth today',
    money(scenarios.base.catalogValue),
    `${scenarios.base.impliedMultiple.toFixed(1)}× a year's earnings`,
  ],
];
const facts = [
  [
    'Official recordings',
    demoCatalog.recordingCount.value?.toLocaleString('en-US') ?? 'Unknown',
  ],
  ['Releases', demoCatalog.releases.length.toLocaleString('en-US')],
  [
    'Weighted catalog age',
    demoCatalog.weightedCatalogAge.value == null
      ? 'Unknown'
      : `${demoCatalog.weightedCatalogAge.value} yrs`,
  ],
  ['Top-10 concentration', percent(concentration.topTenShare, 0)],
];

export default function Home() {
  return (
    <main className="uw min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-[-0.01em]">
            Catalog Underwriter
          </Link>
          <nav
            aria-label="Primary navigation"
            className="ml-auto flex items-center gap-4 text-sm"
          >
            <Link
              className="text-muted-foreground hover:text-foreground"
              href="/methodology"
            >
              Methodology
            </Link>
            <span className="hidden rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs text-muted-foreground sm:inline">
              {METHODOLOGY_VERSION}
            </span>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section className="grid items-end gap-10 pt-14 pb-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:pt-20">
          <div>
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              Public-data catalog underwriting
            </p>
            <h1 className="mt-3 max-w-[14ch] text-[clamp(2.75rem,7vw,4.75rem)] leading-[0.98] font-semibold tracking-[-0.035em]">
              What would you pay for the music?
            </h1>
            <p className="mt-5 max-w-[52ch] font-display text-xl leading-8 text-muted-foreground">
              Search an artist, see what their catalog earns from public
              listening data, and change every term of the deal to see what it
              is worth.
            </p>
          </div>
          <ArtistSearch />
        </section>

        <section
          aria-labelledby="featured-title"
          className="rounded-[18px] border border-border bg-card p-5 sm:p-8"
        >
          <div className="grid items-end gap-6 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-8">
            <div className="max-w-[140px] sm:max-w-none">
              <CatalogArtwork name={demoCatalog.artist.name} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                Featured underwrite · evidence {evidenceDate}
              </p>
              <h2
                id="featured-title"
                className="mt-1 text-[clamp(2rem,4.5vw,3rem)] leading-[1.05] font-semibold tracking-[-0.025em]"
              >
                {demoCatalog.artist.name}
              </h2>
              <div className="mt-4 flex flex-wrap items-baseline gap-3">
                <strong className="text-[clamp(2.5rem,6vw,3.75rem)] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                  {money(scenarios.base.catalogValue)}
                </strong>
                <span className="text-muted-foreground">
                  Base case · {scenarios.base.impliedMultiple.toFixed(1)}×
                  annual earnings · On modeled cash flow
                </span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <dl className="uw-segmented">
                  {(['bear', 'base', 'bull'] as const).map((scenario) => (
                    <div
                      key={scenario}
                      className={
                        scenario === 'base'
                          ? 'rounded-lg bg-card px-3.5 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.12)]'
                          : 'px-3.5 py-1.5'
                      }
                    >
                      <dt className="text-sm font-medium capitalize">
                        {scenario}
                      </dt>
                      <dd className="font-mono text-[11px] text-muted-foreground">
                        {money(scenarios[scenario].catalogValue)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href="/artist/demo/underwrite"
                  className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-foreground"
                >
                  Open the underwrite
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
            {flow.map(([label, value, note]) => (
              <div className="min-w-0 bg-card px-4 py-3.5" key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-xl font-semibold tracking-[-0.01em] tabular-nums">
                  {value}
                </p>
                <p className="text-xs text-muted-foreground">{note}</p>
              </div>
            ))}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            {facts.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-mono text-[15px]">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-6 border-t border-border pt-4 font-display text-[15px] leading-6 text-muted-foreground">
            The cash flow is modeled from Last.fm and YouTube listening (range{' '}
            {money(demoCashFlow.low)}–{money(demoCashFlow.high)}) with default
            payout rates, then valued with a ten-year DCF at an 8.5% discount
            rate.
          </p>
        </section>

        <footer className="mt-12 border-t border-border py-6 text-xs leading-5 text-muted-foreground">
          Educational analysis based on public evidence and editable
          assumptions. Estimates are not verified royalty income, ownership,
          investment advice, or legal advice.
        </footer>
      </div>
    </main>
  );
}
