'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import transactions from '@/data/catalog-transactions.json';
import { defaultValuationAssumptions } from '@/config/valuation-defaults';
import { breakTheDeal, type RiskDiagnostic } from '@/lib/valuation/diagnostics';
import { calculateConcentration } from '@/lib/valuation/concentration';
import {
  calculateScenarios,
  type ScenarioName,
} from '@/lib/valuation/scenarios';
import { buildSensitivityMatrix } from '@/lib/valuation/sensitivity';
import type { ValuationAssumptions } from '@/lib/valuation/dcf';
import type { CatalogSnapshot } from '@/types/catalog';
import { Button } from '@/components/ui/button';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const chartConfig = {
  bear: { label: 'Bear', color: '#9a3428' },
  base: { label: 'Base', color: '#17201f' },
  bull: { label: 'Bull', color: '#356a4d' },
} satisfies ChartConfig;

const money = (value: number, digits = 1) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: digits,
  }).format(value);

const percent = (value: number, digits = 1) =>
  `${(value * 100).toFixed(digits)}%`;

function NumericAssumption({
  label,
  value,
  onChange,
  suffix,
  step = 0.1,
  min,
  max,
  disabled = false,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  step?: number;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const inputId = `assumption-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="block border-b border-ink/12 py-3">
      <span className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <label htmlFor={inputId}>{label}</label>
        <span className="font-mono text-xs text-muted-foreground">
          Assumption
        </span>
      </span>
      <span className="flex items-center border border-ink/20 bg-paper">
        <Input
          id={inputId}
          type="number"
          value={Number.isFinite(value) ? value : ''}
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-9 rounded-none border-0 bg-transparent font-mono shadow-none focus-visible:ring-1"
        />
        <span className="pr-3 font-mono text-xs text-muted-foreground">
          {suffix}
        </span>
      </span>
    </div>
  );
}

function LoadingCatalog() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="w-full max-w-xl border-y-2 border-ink py-8">
        <p className="eyebrow">Building the public record</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          Catalog underwrite in progress
        </h1>
        <ol className="mt-7 space-y-3 text-sm" aria-live="polite">
          <li className="flex justify-between border-b border-ink/12 pb-3">
            <span>Artist resolved</span>
            <span className="text-positive">Complete</span>
          </li>
          <li className="flex justify-between border-b border-ink/12 pb-3">
            <span>Building catalog</span>
            <span className="text-accent">In progress</span>
          </li>
          <li className="flex justify-between border-b border-ink/12 pb-3">
            <span>Matching performance evidence</span>
            <span className="text-muted-foreground">Pending</span>
          </li>
          <li className="flex justify-between">
            <span>Constructing economic model</span>
            <span className="text-muted-foreground">Pending</span>
          </li>
        </ol>
      </div>
    </main>
  );
}

function CatalogError({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5">
      <div className="max-w-xl border-y-2 border-negative py-8">
        <p className="eyebrow text-negative">Catalog unavailable</p>
        <h1 className="mt-3 font-display text-4xl font-semibold">
          This public record could not be completed.
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">{message}</p>
        <Link
          className="mt-6 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
          href="/"
        >
          <ArrowLeft className="size-4" /> Return to artist search
        </Link>
      </div>
    </main>
  );
}

export function UnderwritingWorkbench({
  artistId,
  initialCatalog,
}: {
  artistId: string;
  initialCatalog: CatalogSnapshot | null;
}) {
  const [catalog, setCatalog] = useState<CatalogSnapshot | null>(
    initialCatalog,
  );
  const [loadError, setLoadError] = useState('');
  const [assumptions, setAssumptions] = useState<ValuationAssumptions>({
    ...defaultValuationAssumptions,
    normalizedCashFlow:
      initialCatalog?.publicCashFlowEstimate?.midpoint ?? 1_000_000,
  });
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioName>('base');
  const [useKnownCashFlow, setUseKnownCashFlow] = useState(
    !initialCatalog?.publicCashFlowEstimate,
  );
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  useEffect(() => {
    if (initialCatalog || artistId === 'demo') return;
    let cancelled = false;
    fetch(`/api/artists/${encodeURIComponent(artistId)}`)
      .then(async (response) => {
        const data = (await response.json()) as {
          catalog?: CatalogSnapshot;
          error?: string;
        };
        if (!response.ok || !data.catalog)
          throw new Error(data.error ?? 'Catalog data is unavailable.');
        return data.catalog;
      })
      .then((nextCatalog) => {
        if (cancelled) return;
        setCatalog(nextCatalog);
        setUseKnownCashFlow(!nextCatalog.publicCashFlowEstimate);
        setAssumptions((current) => ({
          ...current,
          normalizedCashFlow:
            nextCatalog.publicCashFlowEstimate?.midpoint ?? 1_000_000,
        }));
      })
      .catch((error: unknown) => {
        if (!cancelled)
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Catalog data is unavailable.',
          );
      });
    return () => {
      cancelled = true;
    };
  }, [artistId, initialCatalog]);

  const results = useMemo(() => {
    try {
      return { data: calculateScenarios(assumptions), error: '' };
    } catch (error) {
      return {
        data: null,
        error:
          error instanceof Error
            ? error.message
            : 'The valuation assumptions are invalid.',
      };
    }
  }, [assumptions]);

  const concentration = useMemo(
    () =>
      calculateConcentration(
        catalog?.tracks.map((track) => track.demandShare) ?? [],
      ),
    [catalog],
  );
  const sensitivity = useMemo(
    () => (results.data ? buildSensitivityMatrix(assumptions) : []),
    [assumptions, results.data],
  );
  const diagnostics = useMemo<RiskDiagnostic[]>(
    () =>
      results.data
        ? breakTheDeal(
            assumptions,
            catalog?.tracks.map((track) => track.demandShare) ?? [],
          )
        : [],
    [assumptions, catalog, results.data],
  );
  const chartData = useMemo(
    () =>
      results.data?.base.forecast.map((base, index) => ({
        year: `Y${base.year}`,
        base: Number((base.economicCashFlow / 1_000_000).toFixed(2)),
        bear: Number(
          (results.data?.bear.forecast[index].economicCashFlow ?? 0) /
            1_000_000,
        ),
        bull: Number(
          (results.data?.bull.forecast[index].economicCashFlow ?? 0) /
            1_000_000,
        ),
      })) ?? [],
    [results.data],
  );

  if (loadError) return <CatalogError message={loadError} />;
  if (!catalog) return <LoadingCatalog />;

  const active = results.data?.[selectedScenario];
  const update = <K extends keyof ValuationAssumptions>(
    key: K,
    value: ValuationAssumptions[K],
  ) => setAssumptions((current) => ({ ...current, [key]: value }));
  const datedReleases = catalog.releases
    .filter((release) => release.year)
    .slice(0, 8);
  const currentYear = new Date().getUTCFullYear();
  const changeCashFlowMode = (checked: boolean) => {
    if (!checked && catalog.publicCashFlowEstimate) {
      update('normalizedCashFlow', catalog.publicCashFlowEstimate.midpoint);
    }
    setUseKnownCashFlow(checked);
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex min-h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              aria-label="Back to search"
              href="/"
              className="grid size-9 shrink-0 place-items-center border border-ink/20 transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <p className="truncate font-display text-lg font-semibold">
                {catalog.artist.name}
              </p>
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.11em] text-muted-foreground">
                Catalog underwrite ·{' '}
                {catalog.isStoredDemo
                  ? 'stored snapshot'
                  : 'live public record'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link
              className="hidden text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline"
              href="/methodology"
            >
              Methodology
            </Link>
            <span className="border border-ink/20 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em]">
              Coverage{' '}
              {catalog.coverage.some((item) => item.level === 'High')
                ? 'Moderate'
                : 'Low'}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-7">
        <div className="grid gap-5 border-b-2 border-ink pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="eyebrow">{catalog.snapshotLabel}</p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {catalog.artist.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {[
                catalog.artist.country,
                catalog.activeYears,
                ...catalog.genres.slice(0, 2),
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          {active && (
            <div className="grid grid-cols-3 gap-6 sm:gap-10">
              <div>
                <p className="eyebrow">Cash flow</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {money(assumptions.normalizedCashFlow)}
                </p>
              </div>
              <div>
                <p className="eyebrow">Multiple</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {active.impliedMultiple.toFixed(1)}×
                </p>
              </div>
              <div>
                <p className="eyebrow">Terminal</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {percent(active.terminalValueShare, 0)}
                </p>
              </div>
            </div>
          )}
        </div>

        {results.error && (
          <div
            role="alert"
            className="mt-5 flex gap-3 border-l-4 border-negative bg-negative/8 p-4 text-sm text-negative"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {results.error}
          </div>
        )}

        <Tabs defaultValue="underwrite" className="mt-6">
          <TabsList
            variant="line"
            className="w-full justify-start gap-3 overflow-x-auto border-b border-ink/15 pb-2"
          >
            <TabsTrigger
              value="evidence"
              className="flex-none rounded-none px-3 py-2"
            >
              Evidence room
            </TabsTrigger>
            <TabsTrigger
              value="underwrite"
              className="flex-none rounded-none px-3 py-2"
            >
              Underwrite
            </TabsTrigger>
            <TabsTrigger
              value="stress"
              className="flex-none rounded-none px-3 py-2"
            >
              Stress test
            </TabsTrigger>
            <TabsTrigger
              value="transactions"
              className="flex-none rounded-none px-3 py-2"
            >
              Market comps
            </TabsTrigger>
          </TabsList>

          <TabsContent value="evidence" className="pt-6">
            <div className="grid gap-7 lg:grid-cols-[1.1fr_.9fr]">
              <section>
                <div className="grid grid-cols-2 gap-px border-y border-ink/15 bg-ink/15 sm:grid-cols-4">
                  {[
                    [
                      'Recordings',
                      catalog.recordingCount.value?.toLocaleString() ??
                        'Unknown',
                    ],
                    [
                      'Release groups',
                      catalog.releases.length.toLocaleString(),
                    ],
                    [
                      'Weighted age',
                      catalog.weightedCatalogAge.value
                        ? `${catalog.weightedCatalogAge.value} yrs`
                        : 'Unknown',
                    ],
                    [
                      'Top-10 share',
                      catalog.tracks.length
                        ? percent(concentration.topTenShare, 0)
                        : 'Unknown',
                    ],
                  ].map(([label, value]) => (
                    <div className="bg-background p-5" key={label}>
                      <p className="font-display text-3xl font-semibold">
                        {value}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <h2 className="mt-8 border-b border-ink/20 pb-3 font-display text-2xl font-semibold">
                  Catalog chronology
                </h2>
                {datedReleases.length ? (
                  <ol className="divide-y divide-ink/12">
                    {datedReleases.map((release) => (
                      <li
                        className="grid grid-cols-[62px_1fr_auto] items-center gap-4 py-4"
                        key={release.id}
                      >
                        <span className="font-mono text-sm text-accent">
                          {release.year}
                        </span>
                        <span>
                          <span className="block font-semibold">
                            {release.title}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {release.secondaryTypes.join(', ') ||
                              release.primaryType}
                          </span>
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {currentYear - (release.year ?? currentYear) <= 3
                            ? 'New'
                            : currentYear - (release.year ?? currentYear) <= 10
                              ? 'Maturing'
                              : 'Established'}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="py-6 text-muted-foreground">
                    No dated releases were returned. This is unknown, not zero.
                  </p>
                )}
              </section>
              <aside>
                <h2 className="border-b border-ink/20 pb-3 font-display text-2xl font-semibold">
                  Evidence coverage
                </h2>
                <div className="divide-y divide-ink/12">
                  {catalog.coverage.map((item) => (
                    <div className="py-4" key={item.label}>
                      <div className="flex items-center justify-between gap-4">
                        <h3 className="font-semibold">{item.label}</h3>
                        <span className="font-mono text-xs uppercase text-accent">
                          {item.level}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
                <Sheet>
                  <SheetTrigger className="mt-5 inline-flex h-10 items-center gap-2 border border-ink/25 px-3 text-sm font-semibold hover:bg-secondary">
                    <Info className="size-4" /> Inspect provenance
                  </SheetTrigger>
                  <SheetContent className="w-[92vw] max-w-md rounded-none bg-paper p-6">
                    <SheetHeader className="p-0">
                      <SheetTitle className="font-display text-2xl">
                        Data transparency
                      </SheetTitle>
                      <SheetDescription>
                        What this snapshot observed, calculated, and could not
                        verify.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-5 space-y-5 overflow-y-auto">
                      {[catalog.recordingCount, catalog.weightedCatalogAge].map(
                        (item, index) => (
                          <div
                            className="border-t border-ink/20 pt-4"
                            key={item.source}
                          >
                            <p className="eyebrow">
                              {index === 0
                                ? 'Recording count'
                                : 'Weighted catalog age'}
                            </p>
                            <p className="mt-2 font-semibold">
                              {item.value ?? 'Unknown'}
                            </p>
                            <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-2 text-sm">
                              <dt className="text-muted-foreground">Method</dt>
                              <dd>{item.method}</dd>
                              <dt className="text-muted-foreground">
                                Confidence
                              </dt>
                              <dd>{item.confidence}</dd>
                              <dt className="text-muted-foreground">Source</dt>
                              <dd>{item.source}</dd>
                              <dt className="text-muted-foreground">
                                Retrieved
                              </dt>
                              <dd>
                                {new Date(item.retrievedAt).toLocaleDateString(
                                  'en-GB',
                                )}
                              </dd>
                            </dl>
                            {item.note && (
                              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {item.note}
                              </p>
                            )}
                            {item.sourceUrl && (
                              <a
                                className="mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4"
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open source <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="underwrite" className="pt-6">
            <div className="grid gap-8 xl:grid-cols-[330px_minmax(0,1fr)_290px]">
              <aside className="border-t-2 border-ink xl:sticky xl:top-24 xl:self-start">
                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="eyebrow">Operating mode</p>
                    <p className="mt-1 font-semibold">Known cash flow</p>
                  </div>
                  <Switch
                    checked={useKnownCashFlow}
                    onCheckedChange={changeCashFlowMode}
                    disabled={!catalog.publicCashFlowEstimate}
                    aria-label="Use my own normalized annual cash flow"
                  />
                </div>
                <p className="border-y border-ink/12 py-3 text-xs leading-5 text-muted-foreground">
                  {useKnownCashFlow
                    ? 'User-entered cash flow overrides the public estimate. Catalog analytics remain available.'
                    : (catalog.publicCashFlowEstimate?.note ??
                      'No defensible public cash-flow estimate is available. Enable Known cash flow to proceed.')}
                </p>
                <NumericAssumption
                  label="Normalized annual cash flow"
                  value={assumptions.normalizedCashFlow / 1_000_000}
                  onChange={(value) =>
                    update('normalizedCashFlow', value * 1_000_000)
                  }
                  suffix="$M"
                  step={0.1}
                  min={0}
                  disabled={!useKnownCashFlow}
                />
                <p className="eyebrow mt-5 border-b border-ink/20 pb-2 text-foreground">
                  What are you buying?
                </p>
                <NumericAssumption
                  label="Master rights share"
                  value={assumptions.masterRightsShare * 100}
                  onChange={(value) => update('masterRightsShare', value / 100)}
                  suffix="%"
                  min={0}
                  max={100}
                />
                <NumericAssumption
                  label="Publishing rights share"
                  value={assumptions.publishingRightsShare * 100}
                  onChange={(value) =>
                    update('publishingRightsShare', value / 100)
                  }
                  suffix="%"
                  min={0}
                  max={100}
                />
                <NumericAssumption
                  label="Songwriter economic interest"
                  value={assumptions.songwriterEconomicInterest * 100}
                  onChange={(value) =>
                    update('songwriterEconomicInterest', value / 100)
                  }
                  suffix="%"
                  min={0}
                  max={100}
                />
                <NumericAssumption
                  label="Admin / distribution fee"
                  value={assumptions.adminFeeRate * 100}
                  onChange={(value) => update('adminFeeRate', value / 100)}
                  suffix="%"
                  min={0}
                  max={100}
                />
                <p className="eyebrow mt-5 border-b border-ink/20 pb-2 text-foreground">
                  Operating assumptions
                </p>
                <NumericAssumption
                  label="Years 1–5 growth / decay"
                  value={assumptions.nearTermGrowthRate * 100}
                  onChange={(value) =>
                    update('nearTermGrowthRate', value / 100)
                  }
                  suffix="%"
                />
                <NumericAssumption
                  label="Mature growth / decay"
                  value={assumptions.matureGrowthRate * 100}
                  onChange={(value) => update('matureGrowthRate', value / 100)}
                  suffix="%"
                />
                <NumericAssumption
                  label="Sync uplift"
                  value={assumptions.syncUpliftRate * 100}
                  onChange={(value) => update('syncUpliftRate', value / 100)}
                  suffix="%"
                  min={0}
                />
                <p className="eyebrow mt-5 border-b border-ink/20 pb-2 text-foreground">
                  Capital assumptions
                </p>
                <NumericAssumption
                  label="Discount rate"
                  value={assumptions.discountRate * 100}
                  onChange={(value) => update('discountRate', value / 100)}
                  suffix="%"
                  min={0}
                />
                <NumericAssumption
                  label="Terminal growth"
                  value={assumptions.terminalGrowthRate * 100}
                  onChange={(value) =>
                    update('terminalGrowthRate', value / 100)
                  }
                  suffix="%"
                />
                <NumericAssumption
                  label="Concentration premium"
                  value={assumptions.concentrationPremium * 100}
                  onChange={(value) =>
                    update('concentrationPremium', value / 100)
                  }
                  suffix="%"
                  min={0}
                />
              </aside>

              <section className="min-w-0">
                <div className="border-y-2 border-ink bg-paper px-4 py-7 sm:px-7">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div>
                      <p className="eyebrow">
                        Indicative catalog interest value
                      </p>
                      <p className="financial-value mt-3">
                        {active ? money(active.catalogValue) : '—'}
                      </p>
                    </div>
                    <div
                      className="flex border border-ink/20"
                      aria-label="Valuation scenario"
                    >
                      {(['bear', 'base', 'bull'] as ScenarioName[]).map(
                        (scenario) => (
                          <button
                            key={scenario}
                            type="button"
                            onClick={() => setSelectedScenario(scenario)}
                            className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${selectedScenario === scenario ? 'bg-ink text-paper' : 'hover:bg-secondary'}`}
                          >
                            {scenario}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  {results.data && (
                    <div className="mt-8 grid grid-cols-3 gap-px border-y border-ink/15 bg-ink/15">
                      {(['bear', 'base', 'bull'] as ScenarioName[]).map(
                        (scenario) => (
                          <button
                            className={`bg-background px-3 py-4 text-left ${selectedScenario === scenario ? 'shadow-[inset_0_-3px_0_var(--accent)]' : ''}`}
                            key={scenario}
                            onClick={() => setSelectedScenario(scenario)}
                          >
                            <span className="eyebrow">{scenario}</span>
                            <span className="mt-1 block font-display text-2xl font-semibold">
                              {money(
                                results.data?.[scenario].catalogValue ?? 0,
                              )}
                            </span>
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-8">
                  <div className="flex items-end justify-between border-b border-ink/20 pb-3">
                    <div>
                      <p className="eyebrow">10-year forecast</p>
                      <h2 className="mt-1 font-display text-2xl font-semibold">
                        Economic cash-flow path
                      </h2>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      $M
                    </span>
                  </div>
                  <ChartContainer
                    config={chartConfig}
                    className="mt-5 h-[310px] w-full aspect-auto"
                    aria-label="Bear, base, and bull annual cash-flow forecast chart"
                  >
                    <LineChart
                      data={chartData}
                      margin={{ left: 0, right: 10, top: 10, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="2 4" />
                      <XAxis dataKey="year" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={36} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        dataKey="bear"
                        type="monotone"
                        stroke="var(--color-bear)"
                        strokeWidth={1.5}
                        dot={false}
                        strokeDasharray="4 4"
                      />
                      <Line
                        dataKey="base"
                        type="monotone"
                        stroke="var(--color-base)"
                        strokeWidth={2.5}
                        dot={false}
                      />
                      <Line
                        dataKey="bull"
                        type="monotone"
                        stroke="var(--color-bull)"
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                  <table className="sr-only">
                    <caption>
                      Projected annual economic cash flow in millions
                    </caption>
                    <thead>
                      <tr>
                        <th>Year</th>
                        <th>Bear</th>
                        <th>Base</th>
                        <th>Bull</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((item) => (
                        <tr key={item.year}>
                          <th>{item.year}</th>
                          <td>{item.bear}</td>
                          <td>{item.base}</td>
                          <td>{item.bull}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {active && (
                  <div className="mt-8">
                    <p className="eyebrow">Value composition</p>
                    <div
                      className="mt-3 flex h-4 w-full"
                      aria-label={`Years one to five ${percent(active.presentValueYearsOneToFive / active.catalogValue)}, years six to ten ${percent(active.presentValueYearsSixToTen / active.catalogValue)}, terminal ${percent(active.terminalValueShare)}`}
                    >
                      <span
                        className="bg-accent"
                        style={{
                          width: `${(active.presentValueYearsOneToFive / active.catalogValue) * 100}%`,
                        }}
                      />
                      <span
                        className="bg-positive"
                        style={{
                          width: `${(active.presentValueYearsSixToTen / active.catalogValue) * 100}%`,
                        }}
                      />
                      <span
                        className="bg-ink"
                        style={{ width: `${active.terminalValueShare * 100}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                      <p>
                        <span className="mb-1 block font-mono text-xs text-accent">
                          Y1–5
                        </span>
                        {money(active.presentValueYearsOneToFive)}
                      </p>
                      <p>
                        <span className="mb-1 block font-mono text-xs text-positive">
                          Y6–10
                        </span>
                        {money(active.presentValueYearsSixToTen)}
                      </p>
                      <p>
                        <span className="mb-1 block font-mono text-xs">
                          Terminal
                        </span>
                        {money(active.presentValueTerminal)}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <aside className="border-t-2 border-ink">
                <p className="eyebrow py-4 text-foreground">
                  Underwriting context
                </p>
                <div className="border-y border-ink/15 py-4">
                  <p className="eyebrow">Public estimate range</p>
                  <p className="mt-2 font-display text-2xl font-semibold">
                    {catalog.publicCashFlowEstimate
                      ? `${money(catalog.publicCashFlowEstimate.low)}–${money(catalog.publicCashFlowEstimate.high)}`
                      : 'Unavailable'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {catalog.publicCashFlowEstimate?.note ??
                      'No earnings level was inferred from catalog metadata alone.'}
                  </p>
                </div>
                <div className="border-b border-ink/15 py-4">
                  <p className="eyebrow">Rights caveat</p>
                  <p className="mt-2 text-sm leading-6">
                    The model does not know what the artist or seller owns.
                    Every rights percentage is an editable assumption.
                  </p>
                </div>
                <div className="py-4">
                  <p className="eyebrow">Scenario method</p>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt>Bear discount rate</dt>
                      <dd className="font-mono">13.0%</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Base discount rate</dt>
                      <dd className="font-mono">
                        {percent(assumptions.discountRate)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>Bull discount rate</dt>
                      <dd className="font-mono">8.5%</dd>
                    </div>
                  </dl>
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="stress" className="pt-6">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_.8fr]">
              <section className="min-w-0">
                <div className="border-b border-ink/20 pb-3">
                  <p className="eyebrow">DCF sensitivity</p>
                  <h2 className="mt-1 font-display text-3xl font-semibold">
                    How fragile is the price?
                  </h2>
                </div>
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-center text-sm">
                    <caption className="sr-only">
                      Catalog value sensitivity by discount rate and terminal
                      growth
                    </caption>
                    <thead>
                      <tr>
                        <th className="p-3 text-left font-mono text-xs text-muted-foreground">
                          Discount ↓ / terminal →
                        </th>
                        {[-0.04, -0.03, -0.02, -0.01, 0, 0.01].map((rate) => (
                          <th className="p-3 font-mono text-xs" key={rate}>
                            {percent(rate, 0)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivity.map((row) => (
                        <tr
                          className="border-t border-ink/12"
                          key={row[0]?.discountRate}
                        >
                          {row.map((cell, index) =>
                            index === 0 ? (
                              <th
                                className="p-3 text-left font-mono"
                                key={cell.terminalGrowthRate}
                              >
                                {percent(cell.discountRate, 0)}
                              </th>
                            ) : null,
                          )}
                          {row.map((cell) => {
                            const isCurrent =
                              Math.abs(
                                cell.discountRate - assumptions.discountRate,
                              ) < 0.006 &&
                              Math.abs(
                                cell.terminalGrowthRate -
                                  assumptions.terminalGrowthRate,
                              ) < 0.006;
                            return (
                              <td
                                key={cell.terminalGrowthRate}
                                className={`border-l border-ink/8 p-3 font-mono ${isCurrent ? 'bg-accent text-white' : 'hover:bg-secondary'}`}
                                title={
                                  cell.value
                                    ? `${money(cell.value)} · ${cell.impliedMultiple?.toFixed(1)}×`
                                    : 'Invalid configuration'
                                }
                              >
                                {cell.value ? money(cell.value, 0) : '—'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <div className="border-b border-ink/20 pb-3">
                  <p className="eyebrow">Catalog concentration</p>
                  <h2 className="mt-1 font-display text-3xl font-semibold">
                    Where demand lives
                  </h2>
                </div>
                {catalog.tracks.length ? (
                  <div className="mt-5 space-y-3">
                    {catalog.tracks.slice(0, 10).map((track) => (
                      <div key={track.id}>
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span className="truncate">{track.title}</span>
                          <span className="font-mono">
                            {track.demandShare.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-secondary">
                          <div
                            className="h-full bg-ink"
                            style={{
                              width: `${Math.min(100, track.demandShare)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="mt-6 grid grid-cols-2 gap-px bg-ink/15 border-y border-ink/15">
                      {[
                        ['Top 1', concentration.topOneShare],
                        ['Top 5', concentration.topFiveShare],
                        ['Top 10', concentration.topTenShare],
                        ['Long tail', concentration.longTailShare],
                      ].map(([label, value]) => (
                        <div className="bg-background p-4" key={String(label)}>
                          <p className="font-display text-2xl font-semibold">
                            {percent(Number(value), 0)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 border-l-4 border-accent bg-accent/8 p-4 text-sm leading-6">
                    No relative track-demand evidence is available.
                    Concentration remains unknown and no risk premium was
                    applied automatically.
                  </p>
                )}
              </section>
            </div>

            <section className="mt-10 border-y-2 border-ink bg-paper p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="eyebrow">Adversarial underwrite</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold">
                    Try to break the deal
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Deterministic diagnostics test terminal dependence, rate
                    sensitivity, decay, concentration, and unverified rights.
                  </p>
                </div>
                <Button
                  onClick={() => setShowDiagnostics(true)}
                  className="h-12 shrink-0 rounded-none bg-negative px-5 text-white hover:bg-ink"
                >
                  <ShieldAlert /> Run diagnostics
                </Button>
              </div>
              {showDiagnostics && (
                <div className="mt-7 grid gap-px bg-ink/15 md:grid-cols-2 xl:grid-cols-5">
                  {diagnostics.map((diagnostic) => (
                    <article
                      className="bg-background p-4"
                      key={diagnostic.title}
                    >
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.1em] ${diagnostic.severity === 'critical' ? 'text-negative' : 'text-accent'}`}
                      >
                        {diagnostic.severity}
                      </span>
                      <h3 className="mt-2 font-semibold">{diagnostic.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {diagnostic.message}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          <TabsContent value="transactions" className="pt-6">
            <div className="max-w-3xl">
              <p className="eyebrow">Comparable transactions</p>
              <h2 className="mt-2 font-display text-4xl font-semibold">
                Does the valuation pass the market smell test?
              </h2>
              <p className="mt-3 leading-7 text-muted-foreground">
                Reported prices are context, not automatic valuation multiples.
                Rights scope and earnings disclosure differ materially across
                transactions.
              </p>
            </div>
            <div className="mt-7 overflow-x-auto border-y border-ink/20">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="font-mono text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    <th className="px-3 py-4">Artist</th>
                    <th className="px-3 py-4">Year</th>
                    <th className="px-3 py-4">Reported price</th>
                    <th className="px-3 py-4">Rights</th>
                    <th className="px-3 py-4">Use</th>
                    <th className="px-3 py-4">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/12">
                  {transactions.map((transaction) => (
                    <tr key={transaction.artist}>
                      <td className="px-3 py-5">
                        <span className="font-semibold">
                          {transaction.artist}
                        </span>
                        <span className="mt-1 block max-w-sm text-xs leading-5 text-muted-foreground">
                          {transaction.notes}
                        </span>
                      </td>
                      <td className="px-3 py-5 font-mono">
                        {transaction.transactionYear}
                      </td>
                      <td className="px-3 py-5 font-display text-xl font-semibold">
                        {transaction.reportedValue
                          ? money(transaction.reportedValue, 0)
                          : 'Undisclosed'}
                      </td>
                      <td className="px-3 py-5">
                        {transaction.rightsIncluded.join(', ')}
                      </td>
                      <td className="px-3 py-5 font-mono text-xs uppercase">
                        {transaction.comparability}
                      </td>
                      <td className="px-3 py-5">
                        <a
                          className="inline-flex items-center gap-1 underline underline-offset-4"
                          href={transaction.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Original report <ExternalLink className="size-3" />
                        </a>
                        {transaction.priceSourceUrl &&
                          transaction.priceSourceUrl !==
                            transaction.sourceUrl && (
                            <a
                              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4"
                              href={transaction.priceSourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Price report <ExternalLink className="size-3" />
                            </a>
                          )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>

        <footer className="mt-12 border-t border-ink/20 py-6 text-xs leading-5 text-muted-foreground">
          Catalog Underwriter is an educational analytical tool based on
          publicly available information and user-defined assumptions. Estimates
          do not represent verified royalty statements, ownership interests,
          market offers, investment advice, or legal advice.
        </footer>
      </div>
    </main>
  );
}
