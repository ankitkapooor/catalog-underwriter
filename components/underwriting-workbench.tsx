'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Info,
  ShieldAlert,
} from 'lucide-react';

import transactions from '@/data/catalog-transactions.json';
import { defaultRightsEconomicsAssumptions } from '@/config/rights-economics';
import {
  defaultValuationAssumptions,
  scenarioAdjustments,
} from '@/config/valuation-defaults';
import { breakTheDeal, type RiskDiagnostic } from '@/lib/valuation/diagnostics';
import { calculateConcentration } from '@/lib/valuation/concentration';
import {
  calculateScenarios,
  type ScenarioName,
} from '@/lib/valuation/scenarios';
import {
  buildSensitivityMatrix,
  SENSITIVITY_TERMINAL_GROWTH_RATES,
} from '@/lib/valuation/sensitivity';
import {
  calculateMarketMultipleValue,
  deriveMarketMultipleRange,
  MARKET_CATEGORY_LABELS,
  reconcileValuations,
  type MarketCategory,
  type MarketMultipleObservation,
} from '@/lib/valuation/market-multiple';
import {
  estimateRightsRevenue,
  type EconomicsScenario,
  type RightsEconomicsAssumptions,
  type RightsEconomicsScenarioAssumptions,
} from '@/lib/valuation/rights-economics';
import {
  calculateEconomicRightsShare,
  type ValuationAssumptions,
} from '@/lib/valuation/dcf';
import { buildModeledCashFlowEstimate } from '@/lib/valuation/public-cash-flow';
import type { CatalogSnapshot } from '@/types/catalog';
import { CatalogArtwork } from '@/components/underwrite/catalog-artwork';
import { EarningsChart } from '@/components/underwrite/earnings-chart';
import {
  count,
  money,
  percent,
  signedMoney,
} from '@/components/underwrite/format';
import { Term } from '@/components/underwrite/term';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const marketObservations =
  transactions as unknown as MarketMultipleObservation[];
const initialMarketMultiple =
  deriveMarketMultipleRange(marketObservations, 'publishing')?.midpoint ??
  Number.NaN;
const reportedSales = transactions
  .filter((item) => item.reportedValue)
  .map((item) => ({
    name: item.artist,
    detail: `${item.rightsIncluded.slice(0, 2).join(', ')} · ${item.transactionYear}`,
    value: item.reportedValue ?? 0,
  }));

const pct =
  (digits = 1) =>
  (value: number) =>
    `${value.toFixed(digits)}%`;
const usd = (value: number) => `$${value.toFixed(2)}`;
const millions = (value: number) => `$${value.toFixed(0)}M`;
const times = (value: number) => `${value.toFixed(0)}×`;
const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

function Card({
  title,
  sub,
  children,
  className,
}: {
  title?: string;
  sub?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-[14px] border border-border bg-card p-[18px]',
        className,
      )}
    >
      {title && <h3 className="text-[15px] font-semibold">{title}</h3>}
      {sub && <p className="mt-0.5 text-[13px] text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}

function Clause({
  id,
  number,
  title,
  source,
  recital,
  children,
}: {
  id: string;
  number: string;
  title: string;
  source?: string;
  recital: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mt-3.5 border-t border-border pt-5 pb-1.5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="font-display text-lg text-accent">{number}</span>
        <h2 className="font-display text-[22px] font-medium tracking-[-0.005em]">
          {title}
        </h2>
        {source && (
          <span className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
            {source}
          </span>
        )}
      </div>
      <p className="mt-1.5 max-w-[66ch] font-display text-base leading-relaxed text-muted-foreground">
        {recital}
      </p>
      {children}
    </section>
  );
}

function LoadingCatalog() {
  return (
    <main className="uw grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-xl rounded-[14px] border border-border bg-card p-8">
        <p className="eyebrow">Building the public record</p>
        <h1 className="mt-3 font-display text-4xl font-medium">
          Catalog underwrite in progress
        </h1>
        <ol className="mt-7 space-y-3 text-sm" aria-live="polite">
          <li className="flex justify-between border-b border-border pb-3">
            <span>Artist resolved</span>
            <span className="text-positive">Complete</span>
          </li>
          <li className="flex justify-between border-b border-border pb-3">
            <span>Building catalog</span>
            <span className="text-accent">In progress</span>
          </li>
          <li className="flex justify-between border-b border-border pb-3">
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
    <main className="uw grid min-h-screen place-items-center px-5">
      <div className="max-w-xl rounded-[14px] border border-border bg-card p-8">
        <p className="eyebrow text-negative">Catalog unavailable</p>
        <h1 className="mt-3 font-display text-4xl font-medium">
          This public record could not be completed.
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">{message}</p>
        <button
          type="button"
          data-hard-navigation="true"
          onClick={() => window.location.assign('/')}
          className="mt-6 inline-flex items-center gap-2 font-semibold underline underline-offset-4"
        >
          <ArrowLeft className="size-4" /> Return to artist search
        </button>
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
  // The entered cash flow stays empty until the user types one; a modeled
  // estimate is applied on top of it while modeled mode is on.
  const [assumptionInputs, setAssumptions] = useState<ValuationAssumptions>({
    ...defaultValuationAssumptions,
    normalizedCashFlow: Number.NaN,
  });
  const [selectedScenario, setSelectedScenario] =
    useState<ScenarioName>('base');
  const [useKnownCashFlow, setUseKnownCashFlow] = useState(
    !initialCatalog?.publicCashFlowEstimate,
  );
  const [marketCategory, setMarketCategory] =
    useState<MarketCategory>('publishing');
  const [selectedMarketMultiple, setSelectedMarketMultiple] = useState(
    initialMarketMultiple,
  );
  const [economicsScenario, setEconomicsScenario] =
    useState<EconomicsScenario>('base');
  const [rightsEconomics, setRightsEconomics] =
    useState<RightsEconomicsAssumptions>(defaultRightsEconomicsAssumptions);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Modeled estimates, live or from the stored demo evidence, follow edits to
  // the rights economics.
  const cashFlowEstimate = useMemo(
    () =>
      catalog?.publicConsumptionEstimate
        ? buildModeledCashFlowEstimate(
            catalog.publicConsumptionEstimate,
            rightsEconomics,
          )
        : (catalog?.publicCashFlowEstimate ?? null),
    [catalog, rightsEconomics],
  );
  const usingModeledCashFlow = !useKnownCashFlow && cashFlowEstimate != null;
  // A modeled estimate also sets the recordings/publishing split, so the
  // rights shares weight the same revenue the estimate produced.
  const assumptions = useMemo<ValuationAssumptions>(
    () =>
      cashFlowEstimate && !useKnownCashFlow
        ? {
            ...assumptionInputs,
            normalizedCashFlow: cashFlowEstimate.midpoint,
            masterRevenueMix:
              cashFlowEstimate.masterRevenueMix ??
              assumptionInputs.masterRevenueMix,
          }
        : assumptionInputs,
    [assumptionInputs, cashFlowEstimate, useKnownCashFlow],
  );

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
    if (!Number.isFinite(assumptions.normalizedCashFlow)) {
      return { data: null, error: '' };
    }
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
  const marketRange = useMemo(
    () => deriveMarketMultipleRange(marketObservations, marketCategory),
    [marketCategory],
  );
  const rightsRevenueEstimate = useMemo(
    () =>
      estimateRightsRevenue(
        catalog?.publicConsumptionEstimate ?? null,
        rightsEconomics,
        economicsScenario,
      ),
    [catalog, economicsScenario, rightsEconomics],
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

  if (loadError) return <CatalogError message={loadError} />;
  if (!catalog) return <LoadingCatalog />;

  const active = results.data?.[selectedScenario];
  const hasCashFlow = Number.isFinite(assumptions.normalizedCashFlow);
  // The market approach prices the same interest as the DCF: cash flow
  // weighted by the master and publishing shares, net of fees.
  const economicCashFlow =
    assumptions.normalizedCashFlow * calculateEconomicRightsShare(assumptions);
  const hasEconomicCashFlow = hasCashFlow && Number.isFinite(economicCashFlow);
  const marketValue =
    hasEconomicCashFlow && Number.isFinite(selectedMarketMultiple)
      ? calculateMarketMultipleValue(economicCashFlow, selectedMarketMultiple)
      : null;
  const reconciliation =
    active && hasEconomicCashFlow && marketRange
      ? reconcileValuations(active.catalogValue, economicCashFlow, marketRange)
      : null;
  const update = <K extends keyof ValuationAssumptions>(
    key: K,
    value: ValuationAssumptions[K],
  ) => setAssumptions((current) => ({ ...current, [key]: value }));
  const datedReleases = catalog.releases
    .filter((release) => release.year)
    .slice(0, 8);
  const observedDemandTracks = catalog.tracks.filter(
    (track) =>
      Number.isFinite(track.lastFmPlaycount) &&
      Number.isFinite(track.lastFmListeners),
  );
  const observedPlaycountTotal = observedDemandTracks.reduce(
    (sum, track) => sum + (track.lastFmPlaycount ?? 0),
    0,
  );
  const observedPeakListeners = observedDemandTracks.reduce(
    (peak, track) => Math.max(peak, track.lastFmListeners ?? 0),
    0,
  );
  const publicEvidenceSummary = [
    catalog.releases.length
      ? `${catalog.releases.length} MusicBrainz release groups`
      : null,
    observedDemandTracks.length
      ? `${observedDemandTracks.length} Last.fm top tracks`
      : null,
    catalog.youtubeVideos.length
      ? `${catalog.youtubeVideos.length} matched YouTube uploads`
      : null,
  ].filter((item): item is string => Boolean(item));
  const currentYear = new Date().getUTCFullYear();
  const changeCashFlowMode = (known: boolean) => {
    // Known mode starts from the modeled figure, to the nearest $10k, so it
    // can be adjusted.
    if (known && !useKnownCashFlow && cashFlowEstimate) {
      update(
        'normalizedCashFlow',
        Math.round(cashFlowEstimate.midpoint / 10_000) * 10_000,
      );
    }
    setUseKnownCashFlow(known);
  };
  const updateRightsEconomics = (
    key: keyof RightsEconomicsScenarioAssumptions,
    value: number,
  ) =>
    setRightsEconomics((current) => ({
      ...current,
      [economicsScenario]: {
        ...current[economicsScenario],
        [key]: Number.isFinite(value) ? value : null,
      },
    }));
  const changeMarketCategory = (category: MarketCategory) => {
    setMarketCategory(category);
    setSelectedMarketMultiple(
      deriveMarketMultipleRange(marketObservations, category)?.midpoint ??
        Number.NaN,
    );
  };
  const resetAll = () => {
    setAssumptions((current) => ({
      ...defaultValuationAssumptions,
      normalizedCashFlow: current.normalizedCashFlow,
    }));
    setRightsEconomics(defaultRightsEconomicsAssumptions);
    setEconomicsScenario('base');
    setSelectedScenario('base');
    changeMarketCategory('publishing');
    setUseKnownCashFlow(!cashFlowEstimate);
  };

  // What-if helpers: the selected case's value under alternative inputs.
  const valueUnder = (candidate: ValuationAssumptions | null) => {
    if (!candidate || !Number.isFinite(candidate.normalizedCashFlow))
      return null;
    try {
      return calculateScenarios(candidate)[selectedScenario].catalogValue;
    } catch {
      return null;
    }
  };
  const withEconomics = (
    economics: RightsEconomicsAssumptions,
  ): ValuationAssumptions | null => {
    const estimate = catalog.publicConsumptionEstimate
      ? buildModeledCashFlowEstimate(
          catalog.publicConsumptionEstimate,
          economics,
        )
      : null;
    return estimate
      ? {
          ...assumptions,
          normalizedCashFlow: estimate.midpoint,
          masterRevenueMix:
            estimate.masterRevenueMix ?? assumptions.masterRevenueMix,
        }
      : null;
  };
  const currentValue = active?.catalogValue ?? null;
  const impactVersus = (candidate: ValuationAssumptions | null) => {
    const alternative = valueUnder(candidate);
    return currentValue == null || alternative == null
      ? null
      : currentValue - alternative;
  };
  const termImpact = (key: keyof ValuationAssumptions) =>
    impactVersus({ ...assumptions, [key]: defaultValuationAssumptions[key] });
  const economicsImpact = (key: keyof RightsEconomicsScenarioAssumptions) =>
    usingModeledCashFlow
      ? impactVersus(
          withEconomics({
            ...rightsEconomics,
            [economicsScenario]: {
              ...rightsEconomics[economicsScenario],
              [key]: defaultRightsEconomicsAssumptions[economicsScenario][key],
            },
          }),
        )
      : null;
  const defaultsValue = valueUnder(
    usingModeledCashFlow
      ? (() => {
          const modeled = withEconomics(defaultRightsEconomicsAssumptions);
          return modeled
            ? {
                ...defaultValuationAssumptions,
                normalizedCashFlow: modeled.normalizedCashFlow,
                masterRevenueMix: modeled.masterRevenueMix,
              }
            : null;
        })()
      : {
          ...defaultValuationAssumptions,
          normalizedCashFlow: assumptions.normalizedCashFlow,
        },
  );
  const changeFromDefaults =
    currentValue != null && defaultsValue != null
      ? currentValue - defaultsValue
      : null;

  // The terms whose nudges move the value most, from where the user has them.
  type Candidate = {
    label: string;
    step: string;
    up: ValuationAssumptions | null;
    down: ValuationAssumptions | null;
  };
  const valuationNudge = (
    label: string,
    step: string,
    key: keyof ValuationAssumptions,
    amount: number,
  ): Candidate => ({
    label,
    step,
    up: { ...assumptions, [key]: assumptions[key] + amount },
    down: { ...assumptions, [key]: assumptions[key] - amount },
  });
  const economicsNudge = (
    label: string,
    step: string,
    key: keyof RightsEconomicsScenarioAssumptions,
    amount: number,
  ): Candidate => {
    const shifted = (delta: number) =>
      withEconomics({
        ...rightsEconomics,
        base: {
          ...rightsEconomics.base,
          [key]: (rightsEconomics.base[key] ?? 0) + delta,
        },
      });
    return { label, step, up: shifted(amount), down: shifted(-amount) };
  };
  const sensitivityCandidates: Candidate[] = [
    valuationNudge('Discount rate', '±1 pt', 'discountRate', 0.01),
    valuationNudge('Long-run growth', '±0.5 pt', 'terminalGrowthRate', 0.005),
    valuationNudge('Growth, years 1–5', '±2 pt', 'nearTermGrowthRate', 0.02),
    valuationNudge('Growth, years 6–10', '±1 pt', 'matureGrowthRate', 0.01),
    valuationNudge(
      'Film, TV and ad licensing',
      '±2 pt',
      'syncUpliftRate',
      0.02,
    ),
    valuationNudge('Collection fee', '±3 pt', 'adminFeeRate', 0.03),
    valuationNudge(
      'Concentration premium',
      '±1 pt',
      'concentrationPremium',
      0.01,
    ),
    ...(usingModeledCashFlow
      ? [
          economicsNudge(
            'Paid per 1,000 streams',
            '±$0.50',
            'audioEffectiveRightsRevenuePerThousand',
            0.5,
          ),
          economicsNudge(
            'Songwriting income',
            '±10 pt',
            'publishingRevenueAsShareOfRecorded',
            0.1,
          ),
          economicsNudge(
            'Income besides streaming',
            '±15 pt',
            'otherRevenueAsShareOfRecorded',
            0.15,
          ),
        ]
      : [
          {
            label: 'Annual cash flow',
            step: '±20%',
            up: {
              ...assumptions,
              normalizedCashFlow: assumptions.normalizedCashFlow * 1.2,
            },
            down: {
              ...assumptions,
              normalizedCashFlow: assumptions.normalizedCashFlow * 0.8,
            },
          },
        ]),
  ];
  const sensitivityRows =
    currentValue == null
      ? []
      : sensitivityCandidates
          .map(({ label, step, up, down }) => {
            const upValue = valueUnder(up);
            const downValue = valueUnder(down);
            const high = upValue == null ? 0 : upValue - currentValue;
            const low = downValue == null ? 0 : downValue - currentValue;
            return {
              label,
              step,
              high,
              low,
              swing: Math.abs(high) + Math.abs(low),
            };
          })
          .filter((row) => row.swing > 0)
          .sort((a, b) => b.swing - a.swing)
          .slice(0, 5);
  const sensitivityScale = Math.max(
    1,
    ...sensitivityRows.map((row) =>
      Math.max(Math.abs(row.high), Math.abs(row.low)),
    ),
  );

  const consumption = catalog.publicConsumptionEstimate;
  const audioStreams = consumption?.audioStreamingEquivalent?.midpoint ?? null;
  const youtubeViews = consumption?.youtubeAnnualViews?.midpoint ?? null;
  const baseEconomics = rightsEconomics.base;
  const streamingRevenue =
    ((audioStreams ?? 0) / 1000) *
      (baseEconomics.audioEffectiveRightsRevenuePerThousand ?? 0) +
    ((youtubeViews ?? 0) / 1000) *
      (baseEconomics.youtubeEffectiveRightsRevenuePerThousand ?? 0);
  const economicShare = hasEconomicCashFlow
    ? economicCashFlow / assumptions.normalizedCashFlow
    : null;
  const scenarioLabel =
    selectedScenario[0].toUpperCase() + selectedScenario.slice(1);
  const scenarioFixesRates = selectedScenario !== 'base';
  const comparison = [
    ...reportedSales,
    ...(currentValue != null
      ? [
          {
            name: catalog.artist.name,
            detail: 'This underwrite',
            value: currentValue,
            current: true,
          },
        ]
      : []),
  ].sort((a, b) => b.value - a.value);
  const calculationSteps: ReactNode[] = [];
  if (usingModeledCashFlow && audioStreams != null) {
    calculationSteps.push(
      <>
        <b>{count(audioStreams)}</b> audio streams at{' '}
        <b>{usd(baseEconomics.audioEffectiveRightsRevenuePerThousand ?? 0)}</b>{' '}
        per 1,000
        {youtubeViews != null && (
          <>
            {' '}
            and <b>{count(youtubeViews)}</b> YouTube views at{' '}
            <b>
              {usd(baseEconomics.youtubeEffectiveRightsRevenuePerThousand ?? 0)}
            </b>
          </>
        )}{' '}
        earn <b>{money(streamingRevenue)}</b> from streaming.
      </>,
      <>
        Adding{' '}
        <b>{percent(baseEconomics.otherRevenueAsShareOfRecorded ?? 0, 0)}</b>{' '}
        for sales and radio and{' '}
        <b>
          {percent(baseEconomics.publishingRevenueAsShareOfRecorded ?? 0, 0)}
        </b>{' '}
        for songwriting gives <b>{money(assumptions.normalizedCashFlow)}</b> a
        year.
      </>,
    );
  } else if (hasCashFlow) {
    calculationSteps.push(
      <>
        Known annual earnings of <b>{money(assumptions.normalizedCashFlow)}</b>{' '}
        for the whole catalog.
      </>,
    );
  }
  if (active && economicShare != null) {
    calculationSteps.push(
      <>
        The buyer&apos;s share after the{' '}
        <b>{percent(assumptions.adminFeeRate)}</b> fee is{' '}
        <b>{percent(economicShare, 0)}</b>, or <b>{money(economicCashFlow)}</b>{' '}
        a year.
      </>,
      selectedScenario === 'base' ? (
        <>
          Earnings grow <b>{percent(assumptions.nearTermGrowthRate)}</b> a year
          for five years, <b>{percent(assumptions.matureGrowthRate)}</b> for
          five more, then <b>{percent(assumptions.terminalGrowthRate)}</b>.
        </>
      ) : (
        <>
          The {selectedScenario} case grows earnings{' '}
          <b>
            {percent(scenarioAdjustments[selectedScenario].nearTermGrowthRate)}
          </b>{' '}
          a year for five years, then{' '}
          <b>
            {percent(scenarioAdjustments[selectedScenario].matureGrowthRate)}
          </b>
          , and{' '}
          <b>
            {percent(scenarioAdjustments[selectedScenario].terminalGrowthRate)}
          </b>{' '}
          after year 10.
        </>
      ),
      <>
        Discounted at <b>{percent(active.effectiveDiscountRate)}</b>, the
        catalog is worth <b>{money(active.catalogValue)}</b>, or{' '}
        <b>{active.impliedMultiple.toFixed(1)}×</b> a year&apos;s earnings.
      </>,
    );
  }

  return (
    <main className="uw min-h-screen pb-24">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex min-h-14 max-w-[1200px] items-center gap-4 px-4 sm:px-6">
          <button
            type="button"
            data-hard-navigation="true"
            aria-label="Back to search"
            onClick={() => window.location.assign('/')}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-secondary"
          >
            <ArrowLeft className="size-4" />
          </button>
          <span className="font-semibold tracking-[-0.01em]">
            Catalog Underwriter
          </span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {catalog.isStoredDemo ? 'Stored snapshot' : 'Live public record'}
          </span>
          <div className="ml-auto flex items-center gap-4">
            <Link
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
              href="/methodology"
            >
              Methodology
            </Link>
            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
              Coverage{' '}
              {catalog.coverage.some((item) => item.level === 'High')
                ? 'moderate'
                : 'low'}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-6">
        <section className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 pt-9 pb-7 sm:grid-cols-[220px_minmax(0,1fr)] sm:items-end sm:gap-8">
          <CatalogArtwork name={catalog.artist.name} />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {[
                catalog.snapshotLabel,
                ...catalog.genres.slice(0, 2),
                `${catalog.releases.length} releases`,
                catalog.recordingCount.value != null
                  ? `${catalog.recordingCount.value.toLocaleString('en-US')} recordings`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <h1 className="mt-1 text-[clamp(2.1rem,5vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.025em]">
              {catalog.artist.name}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {[
                catalog.artist.country,
                catalog.activeYears,
                `Evidence captured ${dateOf(catalog.retrievedAt)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <div className="mt-5 hidden flex-wrap items-baseline gap-3.5 sm:flex">
              <strong className="text-[clamp(2.5rem,6vw,3.75rem)] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                {active ? money(active.catalogValue) : '—'}
              </strong>
              <span className="text-muted-foreground">
                {active
                  ? `${scenarioLabel} case · ${active.impliedMultiple.toFixed(1)}× annual earnings · ${usingModeledCashFlow ? 'On modeled cash flow' : 'On entered cash flow'}`
                  : 'Enter a known annual cash flow in §1 to value this catalog.'}
              </span>
            </div>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-3 sm:col-start-2">
            <strong className="w-full text-[2.5rem] leading-none font-semibold tracking-[-0.03em] tabular-nums sm:hidden">
              {active ? money(active.catalogValue) : '—'}
            </strong>
            <fieldset className="uw-segmented">
              <legend className="sr-only">Scenario</legend>
              {(['bear', 'base', 'bull'] as ScenarioName[]).map((scenario) => (
                <button
                  key={scenario}
                  type="button"
                  aria-pressed={selectedScenario === scenario}
                  disabled={!results.data}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  {scenario[0].toUpperCase() + scenario.slice(1)}
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {results.data
                      ? money(results.data[scenario].catalogValue)
                      : '—'}
                  </span>
                </button>
              ))}
            </fieldset>
            <button
              type="button"
              onClick={resetAll}
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium hover:border-muted-foreground"
            >
              Reset all terms
            </button>
          </div>
        </section>

        <div
          className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4"
          aria-label="How the value is built"
        >
          {[
            [
              'Listening a year',
              usingModeledCashFlow && audioStreams != null
                ? count(audioStreams + (youtubeViews ?? 0))
                : 'Not used',
              usingModeledCashFlow
                ? 'streams and views'
                : 'known earnings entered',
            ],
            [
              usingModeledCashFlow ? 'Modeled cash flow' : 'Catalog earns',
              hasCashFlow ? money(assumptions.normalizedCashFlow) : '—',
              'a year, all rights',
            ],
            [
              'Your share',
              hasEconomicCashFlow ? money(economicCashFlow) : '—',
              economicShare != null
                ? `${percent(economicShare, 0)} after fees`
                : 'set the rights in §2',
            ],
            [
              'Worth today',
              active ? money(active.catalogValue) : '—',
              active
                ? `${active.impliedMultiple.toFixed(1)}× a year's earnings`
                : 'needs a cash flow',
            ],
          ].map(([label, value, note]) => (
            <div className="min-w-0 bg-card px-4 py-3.5" key={label}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-xl font-semibold tracking-[-0.01em] tabular-nums">
                {value}
              </p>
              <p className="text-xs text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>

        {results.error && (
          <div
            role="alert"
            className="mt-4 flex gap-3 rounded-xl bg-negative/10 p-4 text-sm text-negative"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {results.error}
          </div>
        )}

        <section
          aria-live="polite"
          className="mt-4 rounded-xl border border-border bg-card p-4 text-sm leading-6"
        >
          <p
            className={cn(
              'text-xs font-semibold tracking-[0.06em] uppercase',
              publicEvidenceSummary.length ? 'text-positive' : 'text-accent',
            )}
          >
            {!publicEvidenceSummary.length
              ? 'Artist identity resolved'
              : catalog.isStoredDemo
                ? `Stored public evidence · ${dateOf(catalog.retrievedAt)}`
                : 'Public API evidence loaded'}
            {publicEvidenceSummary.length > 0 && (
              <span className="ml-2 font-normal tracking-normal text-muted-foreground normal-case">
                {publicEvidenceSummary.join(' · ')}
              </span>
            )}
          </p>
          {!publicEvidenceSummary.length && (
            <p className="mt-1 font-semibold">
              No release or demand observations were returned for this identity.
            </p>
          )}
          {cashFlowEstimate ? (
            <p className="mt-1 text-muted-foreground">
              The valuation starts from a{' '}
              <strong className="font-semibold text-foreground">
                modeled annual cash flow of {money(cashFlowEstimate.low)}–
                {money(cashFlowEstimate.high)} (base{' '}
                {money(cashFlowEstimate.midpoint)})
              </strong>
              . Yearly listening is estimated from Last.fm listeners and YouTube
              views, then multiplied by default per-1,000-stream rates. It is an
              estimate, not a royalty statement: adjust the rates in §1 or
              switch to a known figure.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">
              MusicBrainz, Last.fm, and YouTube populate the Evidence tab with
              catalog chronology, cumulative demand, and concentration signals.
              Without annual listening evidence and every payout rate, no dollar
              estimate is fabricated from cumulative API metrics. Enter a known
              or hypothetical annual cash flow to run the valuation.
            </p>
          )}
        </section>

        <Tabs defaultValue="terms" className="mt-6">
          <TabsList
            variant="line"
            className="w-full justify-start gap-2 overflow-x-auto border-b border-border pb-1"
          >
            {[
              ['terms', 'Terms'],
              ['evidence', 'Evidence'],
              ['stress', 'Stress test'],
              ['transactions', 'Market comps'],
            ].map(([value, label]) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex-none rounded-none px-3 py-2 text-sm"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="terms" className="pt-6">
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
              <article
                aria-label="Terms of the underwrite"
                className="min-w-0 rounded-[14px] border border-border bg-card px-4 pt-2 pb-5 sm:px-7"
              >
                <h2 className="pt-5 pb-1 font-display text-[26px] font-medium tracking-[-0.01em]">
                  Terms of the underwrite
                </h2>
                <p className="pb-2 font-display text-base text-muted-foreground">
                  Each term below is an assumption you can change. The red tick
                  on each slider marks the default; the figure beside it shows
                  how much the term is moving the value.
                </p>

                <Clause
                  id="earnings"
                  number="§1"
                  title="Earnings"
                  source={
                    usingModeledCashFlow
                      ? 'Modeled from public listening'
                      : 'Entered by you'
                  }
                  recital={
                    audioStreams != null ? (
                      <>
                        The <em className="text-foreground">Catalog</em> is
                        estimated to draw {count(audioStreams)} audio streams
                        {youtubeViews != null &&
                          ` and ${count(youtubeViews)} YouTube views`}{' '}
                        a year. The rates below convert that listening into
                        annual <em className="text-foreground">Earnings</em>.
                      </>
                    ) : (
                      <>
                        No annual listening evidence is available for this{' '}
                        <em className="text-foreground">Catalog</em>, so its
                        annual <em className="text-foreground">Earnings</em>{' '}
                        must be entered.
                      </>
                    )
                  }
                >
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <fieldset className="uw-segmented">
                      <legend className="sr-only">
                        Where the annual cash flow comes from
                      </legend>
                      <button
                        type="button"
                        aria-pressed={usingModeledCashFlow}
                        disabled={!cashFlowEstimate}
                        onClick={() => changeCashFlowMode(false)}
                      >
                        Modeled
                      </button>
                      <button
                        type="button"
                        aria-pressed={!usingModeledCashFlow}
                        onClick={() => changeCashFlowMode(true)}
                      >
                        Known figure
                      </button>
                    </fieldset>
                    {usingModeledCashFlow && cashFlowEstimate && (
                      <span className="text-sm text-muted-foreground">
                        Range {money(cashFlowEstimate.low)}–
                        {money(cashFlowEstimate.high)}
                      </span>
                    )}
                  </div>
                  <Term
                    id="assumption-normalized-annual-cash-flow"
                    label="Normalized annual cash flow"
                    explanation={
                      usingModeledCashFlow
                        ? 'What the whole catalog earns in a typical year, modeled from the rates below. Choose Known figure to type your own.'
                        : 'What the whole catalog earns in a typical year, across recordings and songwriting, before your share and fees.'
                    }
                    value={
                      usingModeledCashFlow
                        ? Math.round(assumptions.normalizedCashFlow / 10_000) /
                          100
                        : assumptions.normalizedCashFlow / 1_000_000
                    }
                    defaultValue={
                      cashFlowEstimate
                        ? Math.round(cashFlowEstimate.midpoint / 100_000) / 10
                        : 10
                    }
                    min={0}
                    max={Math.max(
                      100,
                      Math.ceil(
                        (Number.isFinite(assumptions.normalizedCashFlow)
                          ? assumptions.normalizedCashFlow
                          : 0) / 50_000_000,
                      ) * 50,
                    )}
                    step={0.1}
                    unit="$M"
                    format={millions}
                    onChange={(value) =>
                      update('normalizedCashFlow', value * 1_000_000)
                    }
                    disabled={usingModeledCashFlow}
                    tag={usingModeledCashFlow ? 'Modeled' : undefined}
                  />
                  {catalog.publicConsumptionEstimate && (
                    <div className="mt-2 rounded-xl bg-secondary/60 px-4 pt-3 pb-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold">
                          Payout rates{' '}
                          <span className="font-normal text-muted-foreground">
                            · defaults from public payout reporting
                          </span>
                        </p>
                        <Select
                          value={economicsScenario}
                          onValueChange={(value) =>
                            setEconomicsScenario(value as EconomicsScenario)
                          }
                        >
                          <SelectTrigger
                            aria-label="Payout-rate case to edit"
                            className="h-8 w-36 rounded-lg border-border bg-card"
                          >
                            <SelectValue>
                              {(value: EconomicsScenario) =>
                                `${value[0].toUpperCase()}${value.slice(1)} case`
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              ['low', 'base', 'high'] as EconomicsScenario[]
                            ).map((scenario) => (
                              <SelectItem key={scenario} value={scenario}>
                                {scenario[0].toUpperCase() + scenario.slice(1)}{' '}
                                case
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        The base case sets the modeled cash flow; low and high
                        set its range. Blanking any rate turns the estimate off.
                      </p>
                      <Term
                        id="assumption-audio-effective-rights-economics"
                        label="Paid per 1,000 streams"
                        explanation="What the recordings earn per 1,000 audio streams after the platform's cut. Spotify alone is near $2.60; Apple and Amazon pay more."
                        value={
                          rightsEconomics[economicsScenario]
                            .audioEffectiveRightsRevenuePerThousand ??
                          Number.NaN
                        }
                        defaultValue={
                          defaultRightsEconomicsAssumptions[economicsScenario]
                            .audioEffectiveRightsRevenuePerThousand ?? 0
                        }
                        min={1}
                        max={6}
                        step={0.05}
                        unit="$ / 1k"
                        format={usd}
                        onChange={(value) =>
                          updateRightsEconomics(
                            'audioEffectiveRightsRevenuePerThousand',
                            value,
                          )
                        }
                        impact={economicsImpact(
                          'audioEffectiveRightsRevenuePerThousand',
                        )}
                      />
                      <Term
                        id="assumption-youtube-effective-rights-economics"
                        label="Paid per 1,000 YouTube views"
                        explanation="YouTube pays far less per play than audio services; estimates run $0.60–$2.00 per 1,000 views for all rights holders."
                        value={
                          rightsEconomics[economicsScenario]
                            .youtubeEffectiveRightsRevenuePerThousand ??
                          Number.NaN
                        }
                        defaultValue={
                          defaultRightsEconomicsAssumptions[economicsScenario]
                            .youtubeEffectiveRightsRevenuePerThousand ?? 0
                        }
                        min={0.1}
                        max={2.5}
                        step={0.05}
                        unit="$ / 1k"
                        format={usd}
                        onChange={(value) =>
                          updateRightsEconomics(
                            'youtubeEffectiveRightsRevenuePerThousand',
                            value,
                          )
                        }
                        impact={economicsImpact(
                          'youtubeEffectiveRightsRevenuePerThousand',
                        )}
                      />
                      <Term
                        id="assumption-publishing-share-of-recorded-revenue"
                        label="Songwriting income"
                        explanation="Publishing royalties as a share of what the recordings earn. Legacy writers with radio play and covers can earn far more."
                        value={
                          (rightsEconomics[economicsScenario]
                            .publishingRevenueAsShareOfRecorded ?? Number.NaN) *
                          100
                        }
                        defaultValue={
                          (defaultRightsEconomicsAssumptions[economicsScenario]
                            .publishingRevenueAsShareOfRecorded ?? 0) * 100
                        }
                        min={0}
                        max={150}
                        step={1}
                        unit="%"
                        format={pct(0)}
                        onChange={(value) =>
                          updateRightsEconomics(
                            'publishingRevenueAsShareOfRecorded',
                            value / 100,
                          )
                        }
                        impact={economicsImpact(
                          'publishingRevenueAsShareOfRecorded',
                        )}
                      />
                      <Term
                        id="assumption-other-share-of-recorded-revenue"
                        label="Income besides streaming"
                        explanation="Vinyl, CDs, downloads and radio royalties for the recordings, as a share of streaming. Pink Floyd earns about 4× its streaming this way."
                        value={
                          (rightsEconomics[economicsScenario]
                            .otherRevenueAsShareOfRecorded ?? Number.NaN) * 100
                        }
                        defaultValue={
                          (defaultRightsEconomicsAssumptions[economicsScenario]
                            .otherRevenueAsShareOfRecorded ?? 0) * 100
                        }
                        min={0}
                        max={300}
                        step={5}
                        unit="%"
                        format={pct(0)}
                        onChange={(value) =>
                          updateRightsEconomics(
                            'otherRevenueAsShareOfRecorded',
                            value / 100,
                          )
                        }
                        impact={economicsImpact(
                          'otherRevenueAsShareOfRecorded',
                        )}
                      />
                      <p className="border-t border-border py-3 text-xs text-muted-foreground">
                        {rightsRevenueEstimate
                          ? `${economicsScenario[0].toUpperCase()}${economicsScenario.slice(1)} case rights revenue ${money(rightsRevenueEstimate.normalizedAnnualRightsRevenue)}: audio ${money(rightsRevenueEstimate.audioStreaming)} · YouTube ${money(rightsRevenueEstimate.youtube)} · publishing ${money(rightsRevenueEstimate.publishing)} · other ${money(rightsRevenueEstimate.other)}`
                          : 'Rights revenue needs annual listening evidence and every rate for this case.'}
                      </p>
                    </div>
                  )}
                </Clause>

                <Clause
                  id="rights"
                  number="§2"
                  title="Rights conveyed"
                  recital={
                    <>
                      The <em className="text-foreground">Buyer</em> acquires
                      the interests below. Revenue splits{' '}
                      {percent(assumptions.masterRevenueMix, 0)} recordings and{' '}
                      {percent(1 - assumptions.masterRevenueMix, 0)} publishing
                      (
                      {usingModeledCashFlow && cashFlowEstimate.masterRevenueMix
                        ? 'from the modeled revenue'
                        : 'default assumption'}
                      ); each share applies to its side, and the market multiple
                      uses the same weighted cash flow.
                    </>
                  }
                >
                  <Term
                    id="assumption-master-rights-share"
                    label="Master recordings"
                    explanation="Share of the recordings acquired. An artist selling only their royalty on label-owned masters might convey 15–25%."
                    value={assumptionInputs.masterRightsShare * 100}
                    defaultValue={
                      defaultValuationAssumptions.masterRightsShare * 100
                    }
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    format={pct(0)}
                    onChange={(value) =>
                      update('masterRightsShare', value / 100)
                    }
                    impact={termImpact('masterRightsShare')}
                  />
                  <Term
                    id="assumption-publishing-rights-share"
                    label="Publishing copyrights"
                    explanation="Share of the songs themselves, as opposed to the recordings of them."
                    value={assumptionInputs.publishingRightsShare * 100}
                    defaultValue={
                      defaultValuationAssumptions.publishingRightsShare * 100
                    }
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    format={pct(0)}
                    onChange={(value) =>
                      update('publishingRightsShare', value / 100)
                    }
                    impact={termImpact('publishingRightsShare')}
                  />
                  <Term
                    id="assumption-songwriter-economic-interest"
                    label="Writer share"
                    explanation="Most hits have several writers. This is the portion of the publishing the seller actually controls."
                    value={assumptionInputs.songwriterEconomicInterest * 100}
                    defaultValue={
                      defaultValuationAssumptions.songwriterEconomicInterest *
                      100
                    }
                    min={0}
                    max={100}
                    step={1}
                    unit="%"
                    format={pct(0)}
                    onChange={(value) =>
                      update('songwriterEconomicInterest', value / 100)
                    }
                    impact={termImpact('songwriterEconomicInterest')}
                  />
                  <Term
                    id="assumption-admin-distribution-fee"
                    label="Collection fee"
                    explanation="Kept by the label, distributor or administrator for collecting the money."
                    value={assumptionInputs.adminFeeRate * 100}
                    defaultValue={
                      defaultValuationAssumptions.adminFeeRate * 100
                    }
                    min={0}
                    max={25}
                    step={0.5}
                    unit="%"
                    format={pct(1)}
                    onChange={(value) => update('adminFeeRate', value / 100)}
                    impact={termImpact('adminFeeRate')}
                  />
                </Clause>

                <Clause
                  id="growth"
                  number="§3"
                  title="Growth"
                  recital={
                    <>
                      <em className="text-foreground">Earnings</em> are
                      projected for ten years. Recorded music grew about 5–6% a
                      year recently; mature catalogs tend toward inflation.
                      {scenarioFixesRates &&
                        ` The ${selectedScenario} case uses its own growth rates; switch to Base to apply yours.`}
                    </>
                  }
                >
                  <Term
                    id="assumption-years-1-5-growth-decay"
                    label="Growth, years 1–5"
                    explanation="Annual change in earnings in the near term; positive while the catalog keeps finding listeners."
                    value={assumptionInputs.nearTermGrowthRate * 100}
                    defaultValue={
                      defaultValuationAssumptions.nearTermGrowthRate * 100
                    }
                    min={-8}
                    max={15}
                    step={0.25}
                    unit="%"
                    format={pct(1)}
                    onChange={(value) =>
                      update('nearTermGrowthRate', value / 100)
                    }
                    impact={termImpact('nearTermGrowthRate')}
                  />
                  <Term
                    id="assumption-mature-growth-decay"
                    label="Growth, years 6–10"
                    explanation="Mature catalogs usually slow toward inflation or decline gently."
                    value={assumptionInputs.matureGrowthRate * 100}
                    defaultValue={
                      defaultValuationAssumptions.matureGrowthRate * 100
                    }
                    min={-8}
                    max={8}
                    step={0.25}
                    unit="%"
                    format={pct(1)}
                    onChange={(value) =>
                      update('matureGrowthRate', value / 100)
                    }
                    impact={termImpact('matureGrowthRate')}
                  />
                  <Term
                    id="assumption-sync-uplift"
                    label="Film, TV and ad licensing"
                    explanation="Extra income from placing songs in film, TV, ads and games, on top of normal earnings."
                    value={assumptionInputs.syncUpliftRate * 100}
                    defaultValue={
                      defaultValuationAssumptions.syncUpliftRate * 100
                    }
                    min={0}
                    max={20}
                    step={0.5}
                    unit="%"
                    format={pct(1)}
                    onChange={(value) => update('syncUpliftRate', value / 100)}
                    impact={termImpact('syncUpliftRate')}
                  />
                </Clause>

                <Clause
                  id="pricing"
                  number="§4"
                  title="Pricing"
                  recital={
                    <>
                      Future <em className="text-foreground">Earnings</em> are
                      discounted to a present value at the rates below, and
                      separately priced at a market multiple drawn from
                      disclosed transactions.
                      {scenarioFixesRates &&
                        ` The ${selectedScenario} case uses its own discount and long-run rates.`}
                    </>
                  }
                >
                  <Term
                    id="assumption-discount-rate"
                    label="Discount rate"
                    explanation="The yearly return a buyer requires. Independent valuers used 8.5% for listed catalog funds."
                    value={assumptionInputs.discountRate * 100}
                    defaultValue={
                      defaultValuationAssumptions.discountRate * 100
                    }
                    min={5}
                    max={15}
                    step={0.25}
                    unit="%"
                    format={pct(1)}
                    onChange={(value) => update('discountRate', value / 100)}
                    impact={termImpact('discountRate')}
                  />
                  <Term
                    id="assumption-terminal-growth"
                    label="Long-run growth"
                    explanation="Growth assumed after year 10. It drives about half the value, so keep it modest and below the discount rate."
                    value={assumptionInputs.terminalGrowthRate * 100}
                    defaultValue={
                      defaultValuationAssumptions.terminalGrowthRate * 100
                    }
                    min={-4}
                    max={4.5}
                    step={0.25}
                    unit="%"
                    format={pct(1)}
                    onChange={(value) =>
                      update('terminalGrowthRate', value / 100)
                    }
                    impact={termImpact('terminalGrowthRate')}
                  />
                  <Term
                    id="assumption-concentration-premium"
                    label="Concentration premium"
                    explanation={`Extra return required when a few songs carry the catalog. Here the top 10 tracks are ${catalog.tracks.length ? percent(concentration.topTenShare, 0) : 'unknown'} of listening.`}
                    value={assumptionInputs.concentrationPremium * 100}
                    defaultValue={
                      defaultValuationAssumptions.concentrationPremium * 100
                    }
                    min={0}
                    max={5}
                    step={0.25}
                    unit="%"
                    format={pct(1)}
                    onChange={(value) =>
                      update('concentrationPremium', value / 100)
                    }
                    impact={termImpact('concentrationPremium')}
                  />
                  <div className="grid gap-x-7 gap-y-2 border-b border-border py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,16.5rem)] sm:items-center">
                    <div>
                      <p className="font-semibold">Comparable transactions</p>
                      <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">
                        The set of disclosed deals the market multiple is drawn
                        from.
                      </p>
                    </div>
                    <Select
                      value={marketCategory}
                      onValueChange={(value) =>
                        changeMarketCategory(value as MarketCategory)
                      }
                    >
                      <SelectTrigger
                        aria-label="Market category"
                        className="h-9 w-full rounded-lg border-border bg-card"
                      >
                        <SelectValue>
                          {(value: MarketCategory) =>
                            MARKET_CATEGORY_LABELS[value]
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(
                            MARKET_CATEGORY_LABELS,
                          ) as MarketCategory[]
                        ).map((category) => (
                          <SelectItem key={category} value={category}>
                            {MARKET_CATEGORY_LABELS[category]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Term
                    id="assumption-selected-market-multiple"
                    label="Market multiple"
                    explanation={
                      marketRange
                        ? `Price paid per dollar of yearly earnings: ${marketRange.low.toFixed(2)}×–${marketRange.high.toFixed(2)}× across ${marketRange.sampleSize} ${marketRange.basis}.`
                        : 'No disclosed transaction multiples are available.'
                    }
                    value={selectedMarketMultiple}
                    defaultValue={
                      marketRange?.midpoint ?? initialMarketMultiple
                    }
                    min={5}
                    max={30}
                    step={0.25}
                    unit="×"
                    format={times}
                    onChange={setSelectedMarketMultiple}
                  />
                </Clause>

                <div className="mt-7 grid grid-cols-2 gap-6 text-xs text-muted-foreground">
                  <div className="border-t border-foreground pt-1.5">
                    <p className="mb-1 font-display text-lg text-foreground italic">
                      Catalog Underwriter
                    </p>
                    Prepared from public evidence
                  </div>
                  <div className="border-t border-foreground pt-1.5">
                    <p className="mb-1 font-display text-lg text-foreground italic">
                      {dateOf(catalog.retrievedAt)}
                    </p>
                    Evidence date
                  </div>
                </div>
              </article>

              <aside
                aria-label="Summary"
                className="grid gap-4 lg:sticky lg:top-20"
              >
                <Card title="Summary">
                  <dl className="mt-3.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 text-sm">
                    <dt className="text-muted-foreground">
                      {usingModeledCashFlow
                        ? 'Modeled cash flow'
                        : 'Annual cash flow'}
                    </dt>
                    <dd className="text-right font-mono">
                      {hasCashFlow
                        ? money(assumptions.normalizedCashFlow)
                        : '—'}
                    </dd>
                    <dt className="text-muted-foreground">
                      Your share after fees
                    </dt>
                    <dd className="text-right font-mono">
                      {hasEconomicCashFlow ? money(economicCashFlow) : '—'}
                    </dd>
                    <dt className="text-muted-foreground">DCF value</dt>
                    <dd className="text-right font-mono">
                      {active ? money(active.catalogValue) : '—'}
                    </dd>
                    <dt className="text-muted-foreground">
                      Market multiple value
                    </dt>
                    <dd className="text-right font-mono">
                      {marketValue == null ? '—' : money(marketValue)}
                    </dd>
                    <dt className="border-t border-border pt-2.5 font-semibold">
                      Reconciled indicative range
                    </dt>
                    <dd className="border-t border-border pt-2.5 text-right font-mono font-semibold">
                      {reconciliation
                        ? `${money(reconciliation.low)}–${money(reconciliation.high)}`
                        : '—'}
                    </dd>
                  </dl>
                  {reconciliation && (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {reconciliation.method}
                    </p>
                  )}
                  {active && (
                    <>
                      <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-secondary">
                        {[
                          [
                            active.presentValueYearsOneToFive,
                            'var(--foreground)',
                          ],
                          [
                            active.presentValueYearsSixToTen,
                            'var(--muted-foreground)',
                          ],
                          [active.presentValueTerminal, 'var(--accent)'],
                        ].map(([value, color]) => (
                          <div
                            key={String(color)}
                            className="transition-[width]"
                            style={{
                              width: `${(Number(value) / active.catalogValue) * 100}%`,
                              background: String(color),
                            }}
                          />
                        ))}
                      </div>
                      <div className="mt-3 grid gap-1.5 text-[13px]">
                        {[
                          [
                            'Years 1–5',
                            active.presentValueYearsOneToFive,
                            'var(--foreground)',
                          ],
                          [
                            'Years 6–10',
                            active.presentValueYearsSixToTen,
                            'var(--muted-foreground)',
                          ],
                          [
                            'After year 10',
                            active.presentValueTerminal,
                            'var(--accent)',
                          ],
                        ].map(([label, value, color]) => (
                          <div
                            className="flex justify-between gap-2"
                            key={String(label)}
                          >
                            <span>
                              <i
                                className="mr-2 inline-block size-2 rounded-full"
                                style={{ background: String(color) }}
                              />
                              {label}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {money(Number(value))} ·{' '}
                              {percent(Number(value) / active.catalogValue, 0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </Card>

                {results.data && active && (
                  <Card
                    title="Earnings by year"
                    sub={`Your share after fees, ${selectedScenario} case. Dotted lines show bear and bull.`}
                  >
                    <EarningsChart
                      active={active.forecast}
                      bear={results.data.bear.forecast}
                      bull={results.data.bull.forecast}
                    />
                  </Card>
                )}

                {sensitivityRows.length > 0 && (
                  <Card
                    title="What moves the value"
                    sub="One term nudged up (green) and down (red)."
                  >
                    <div className="mt-3.5 grid gap-2.5">
                      {sensitivityRows.map((row) => (
                        <div
                          className="grid grid-cols-[minmax(0,1fr)_7.5rem] items-center gap-2.5 text-[13px]"
                          key={row.label}
                        >
                          <span className="truncate">
                            {row.label}{' '}
                            <small className="font-mono text-[11px] text-muted-foreground">
                              {row.step} ·{' '}
                              {money(
                                Math.max(Math.abs(row.high), Math.abs(row.low)),
                                0,
                              )}
                            </small>
                          </span>
                          <span className="relative h-1.5 rounded-full bg-secondary">
                            <span className="absolute -top-1 bottom-[-4px] left-1/2 w-px bg-muted-foreground" />
                            {[row.high, row.low].map((delta, index) => {
                              const width =
                                (Math.abs(delta) / sensitivityScale) * 50;
                              return (
                                <span
                                  key={index}
                                  className={cn(
                                    'absolute top-0 h-1.5 rounded-full',
                                    delta >= 0 ? 'bg-positive' : 'bg-negative',
                                  )}
                                  style={{
                                    left: `${delta >= 0 ? 50 : 50 - width}%`,
                                    width: `${width}%`,
                                  }}
                                />
                              );
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card
                  title="Compared with reported sales"
                  sub="Prices for scale; each deal covered different rights."
                >
                  <ol className="mt-2.5 grid">
                    {comparison.map((row, index) => (
                      <li
                        key={row.name}
                        className={cn(
                          'grid grid-cols-[1.4rem_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-border py-2 text-sm last:border-b-0',
                          'current' in row &&
                            '-mx-[18px] rounded-lg border-transparent bg-accent/10 px-[18px]',
                        )}
                      >
                        <span
                          className={cn(
                            'text-right font-mono text-xs',
                            'current' in row
                              ? 'text-accent'
                              : 'text-muted-foreground',
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate">{row.name}</span>
                          <small className="block truncate text-xs text-muted-foreground">
                            {row.detail}
                          </small>
                        </span>
                        <span className="font-mono text-[13px]">
                          {money(row.value, 0)}
                        </span>
                      </li>
                    ))}
                  </ol>
                </Card>

                {calculationSteps.length > 0 && (
                  <Card title="How this value is calculated">
                    <ol className="mt-2.5 grid list-decimal gap-1.5 pl-[18px] font-display text-[15px] leading-normal [&_b]:font-mono [&_b]:text-[13px] [&_b]:font-medium">
                      {calculationSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </Card>
                )}

                <Card title="Underwriting notes">
                  <p className="mt-2 text-sm leading-6">
                    The model does not know what the artist or seller owns.
                    Every rights percentage is an editable assumption.
                  </p>
                  <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2 text-sm">
                    <dt className="text-muted-foreground">
                      Bear discount rate
                    </dt>
                    <dd className="font-mono">
                      {percent(scenarioAdjustments.bear.discountRate)}
                    </dd>
                    <dt className="text-muted-foreground">
                      Base discount rate
                    </dt>
                    <dd className="font-mono">
                      {percent(assumptions.discountRate)}
                    </dd>
                    <dt className="text-muted-foreground">
                      Bull discount rate
                    </dt>
                    <dd className="font-mono">
                      {percent(scenarioAdjustments.bull.discountRate)}
                    </dd>
                  </dl>
                </Card>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="evidence" className="pt-6">
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="grid min-w-0 gap-4">
                <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
                  {[
                    [
                      'Official recordings',
                      catalog.recordingCount.value?.toLocaleString() ??
                        'Unknown',
                    ],
                    [
                      'Observed releases',
                      catalog.releases.length.toLocaleString(),
                    ],
                    [
                      'Calculated weighted age',
                      catalog.weightedCatalogAge.value
                        ? `${catalog.weightedCatalogAge.value} yrs`
                        : 'Unknown',
                    ],
                    [
                      'Calculated top-10 share',
                      catalog.tracks.length
                        ? percent(concentration.topTenShare, 0)
                        : 'Unknown',
                    ],
                  ].map(([label, value]) => (
                    <div className="bg-card p-4" key={label}>
                      <p className="text-2xl font-semibold tracking-[-0.02em]">
                        {value}
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Card title="Public demand" sub="Last.fm · cumulative">
                    {observedDemandTracks.length ? (
                      <dl className="mt-3 grid gap-2 text-sm">
                        {[
                          [
                            'Top-track scrobbles',
                            observedPlaycountTotal.toLocaleString('en-US'),
                          ],
                          [
                            'Peak listeners',
                            observedPeakListeners.toLocaleString('en-US'),
                          ],
                          [
                            'Tracks observed',
                            String(observedDemandTracks.length),
                          ],
                        ].map(([label, value]) => (
                          <div
                            className="flex justify-between gap-3"
                            key={label}
                          >
                            <dt className="text-muted-foreground">{label}</dt>
                            <dd className="font-mono">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        No absolute Last.fm demand observations are available.
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Scrobbles and listeners are demand proxies, not
                      royalty-bearing streams or platform payouts.
                    </p>
                  </Card>
                  <Card title="Official video" sub="YouTube · cumulative">
                    {catalog.youtubeVideos.length ? (
                      <>
                        <p className="mt-2 text-xl font-semibold tabular-nums">
                          {catalog.youtubeVideos
                            .reduce((sum, video) => sum + video.viewCount, 0)
                            .toLocaleString('en-US')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          views on {catalog.youtubeVideos.length} matched
                          uploads
                        </p>
                      </>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        No official-video evidence is available.
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Fan uploads are excluded; the modeled annual range is
                      under annual consumption.
                    </p>
                  </Card>
                  <Card title="Annual consumption" sub="Modeled">
                    {consumption?.audioStreamingEquivalent ||
                    consumption?.youtubeAnnualViews ? (
                      <dl className="mt-3 grid gap-2 text-sm">
                        {(
                          [
                            [
                              'Audio streams / yr',
                              consumption.audioStreamingEquivalent,
                            ],
                            [
                              'YouTube views / yr',
                              consumption.youtubeAnnualViews,
                            ],
                          ] as const
                        ).map(([label, range]) =>
                          range ? (
                            <div
                              className="flex justify-between gap-3"
                              key={label}
                            >
                              <dt className="text-muted-foreground">{label}</dt>
                              <dd className="font-mono">
                                {count(range.low)}–{count(range.high)}
                              </dd>
                            </div>
                          ) : null,
                        )}
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">
                        No current annual/run-rate observation or disclosed
                        modeled annualization is available.
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Calibrated against public Spotify and YouTube view
                      histories. Inspect provenance for the method.
                    </p>
                  </Card>
                </div>

                <Card title="Modeled · normalized cash flow">
                  {cashFlowEstimate ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold tabular-nums">
                        {money(cashFlowEstimate.low)}–
                        {money(cashFlowEstimate.high)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Base {money(cashFlowEstimate.midpoint)} ·{' '}
                        {cashFlowEstimate.confidence} confidence
                      </p>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {cashFlowEstimate.note}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Not calculated. A modeled cash flow needs annual listening
                      evidence and every payout rate in §1. Enter a known or
                      hypothetical annual cash flow to continue.
                    </p>
                  )}
                </Card>

                <Card
                  title="Catalog chronology"
                  sub="Most recent dated releases"
                >
                  {datedReleases.length ? (
                    <ol className="mt-2 divide-y divide-border">
                      {datedReleases.map((release) => (
                        <li
                          className="grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 py-3"
                          key={release.id}
                        >
                          <span className="font-mono text-sm text-accent">
                            {release.year}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">
                              {release.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {release.secondaryTypes.join(', ') ||
                                release.primaryType}
                            </span>
                          </span>
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
                            {currentYear - (release.year ?? currentYear) <= 3
                              ? 'New'
                              : currentYear - (release.year ?? currentYear) <=
                                  10
                                ? 'Maturing'
                                : 'Established'}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="py-4 text-muted-foreground">
                      No dated releases were returned. This is unknown, not
                      zero.
                    </p>
                  )}
                </Card>
              </div>

              <Card title="Evidence coverage">
                <div className="mt-2 divide-y divide-border">
                  {catalog.coverage.map((item) => (
                    <div className="py-3.5" key={item.label}>
                      <div className="flex items-center justify-between gap-4">
                        <h4 className="font-semibold">{item.label}</h4>
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
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
                  <SheetTrigger className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-border px-3.5 text-sm font-medium hover:bg-secondary">
                    <Info className="size-4" /> Inspect provenance
                  </SheetTrigger>
                  <SheetContent className="uw w-[92vw] max-w-md p-6">
                    <SheetHeader className="p-0">
                      <SheetTitle className="font-display text-2xl font-medium">
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
                            className="border-t border-border pt-4"
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
                      {catalog.publicConsumptionEstimate?.inputs.map(
                        (input) => (
                          <div
                            className="border-t border-border pt-4"
                            key={`${input.label}-${input.value}`}
                          >
                            <p className="eyebrow">{input.label}</p>
                            <p className="mt-2 font-semibold">{input.value}</p>
                            <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-2 text-sm">
                              <dt className="text-muted-foreground">Layer</dt>
                              <dd>{input.layer ?? 'observed-consumption'}</dd>
                              <dt className="text-muted-foreground">Timing</dt>
                              <dd>{input.observationTiming ?? 'Unknown'}</dd>
                              <dt className="text-muted-foreground">Method</dt>
                              <dd>{input.method}</dd>
                            </dl>
                            {input.note && (
                              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                {input.note}
                              </p>
                            )}
                            {input.source?.startsWith('http') ? (
                              <a
                                className="mt-3 inline-flex items-center gap-1 text-sm underline underline-offset-4"
                                href={input.source}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Open source <ExternalLink className="size-3" />
                              </a>
                            ) : input.source ? (
                              <p className="mt-3 text-sm text-muted-foreground">
                                Source: {input.source}
                              </p>
                            ) : null}
                          </div>
                        ),
                      )}
                    </div>
                  </SheetContent>
                </Sheet>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="stress" className="pt-6">
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <Card
                title="How fragile is the price?"
                sub="DCF value by discount rate and long-run growth. The highlighted cell is your current case."
              >
                {results.data ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-center text-sm">
                      <caption className="sr-only">
                        Catalog value sensitivity by discount rate and terminal
                        growth
                      </caption>
                      <thead>
                        <tr>
                          <th className="p-2.5 text-left font-mono text-xs font-normal text-muted-foreground">
                            Discount ↓ / long-run →
                          </th>
                          {SENSITIVITY_TERMINAL_GROWTH_RATES.map((rate) => (
                            <th
                              className="p-2.5 font-mono text-xs font-medium"
                              key={rate}
                            >
                              {percent(rate, 0)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivity.map((row) => (
                          <tr
                            className="border-t border-border"
                            key={row[0]?.discountRate}
                          >
                            {row.map((cell, index) =>
                              index === 0 ? (
                                <th
                                  className="p-2.5 text-left font-mono font-medium"
                                  key={cell.terminalGrowthRate}
                                >
                                  {percent(cell.discountRate)}
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
                                  className={cn(
                                    'p-2.5 font-mono',
                                    isCurrent
                                      ? 'rounded-md bg-accent text-white'
                                      : 'hover:bg-secondary',
                                  )}
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
                ) : (
                  <p className="mt-4 rounded-xl bg-secondary p-4 text-sm leading-6">
                    Enter a known or hypothetical annual cash flow before
                    reviewing DCF sensitivity.
                  </p>
                )}
              </Card>

              <Card
                title="Where demand lives"
                sub="Share of observed listening"
              >
                {catalog.tracks.length ? (
                  <div className="mt-4 space-y-3">
                    {catalog.tracks.slice(0, 10).map((track, index) => (
                      <div key={track.id}>
                        <div className="mb-1 flex justify-between gap-3 text-sm">
                          <span className="truncate">
                            <span className="mr-2 font-mono text-xs text-muted-foreground">
                              {index + 1}
                            </span>
                            {track.title}
                          </span>
                          <span className="font-mono">
                            {track.demandShare.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-foreground"
                            style={{
                              width: `${Math.min(100, (track.demandShare / Math.max(...catalog.tracks.slice(0, 10).map((item) => item.demandShare))) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border">
                      {[
                        ['Top 1', concentration.topOneShare],
                        ['Top 5', concentration.topFiveShare],
                        ['Top 10', concentration.topTenShare],
                        ['Long tail', concentration.longTailShare],
                      ].map(([label, value]) => (
                        <div className="bg-card p-3.5" key={String(label)}>
                          <p className="text-xl font-semibold">
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
                  <p className="mt-4 rounded-xl bg-secondary p-4 text-sm leading-6">
                    No relative track-demand evidence is available.
                    Concentration remains unknown and no risk premium was
                    applied automatically.
                  </p>
                )}
              </Card>
            </div>

            <Card className="mt-6">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-display text-2xl font-medium">
                    Try to break the deal
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Deterministic diagnostics test terminal dependence, rate
                    sensitivity, decay, concentration, and unverified rights.
                  </p>
                </div>
                <Button
                  onClick={() => setShowDiagnostics(true)}
                  disabled={!results.data}
                  className="h-10 shrink-0 rounded-full bg-foreground px-5 text-background hover:bg-accent"
                >
                  <ShieldAlert /> Run diagnostics
                </Button>
              </div>
              {showDiagnostics && (
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  {diagnostics.map((diagnostic) => (
                    <article
                      className="rounded-xl border border-border p-4"
                      key={diagnostic.title}
                    >
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                          diagnostic.severity === 'critical'
                            ? 'bg-negative/10 text-negative'
                            : 'bg-accent/10 text-accent',
                        )}
                      >
                        {diagnostic.severity}
                      </span>
                      <h4 className="mt-2.5 font-semibold">
                        {diagnostic.title}
                      </h4>
                      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                        {diagnostic.message}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="pt-6">
            <div className="max-w-3xl">
              <h2 className="font-display text-3xl font-medium">
                Does the valuation pass the market smell test?
              </h2>
              <p className="mt-2 leading-7 text-muted-foreground">
                Reported prices are context, not automatic valuation multiples.
                Starting multiple ranges use only transactions with disclosed
                income multiples. Rights scope and earnings definitions still
                differ materially.
              </p>
            </div>
            <Card className="mt-6 p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      {[
                        'Artist',
                        'Year',
                        'Reported price',
                        'Reported multiple',
                        'Rights',
                        'Use',
                        'Source',
                      ].map((heading) => (
                        <th className="px-4 py-3.5 font-medium" key={heading}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {transactions.map((transaction) => (
                      <tr
                        key={`${transaction.artist}-${transaction.transactionYear}-${transaction.buyer}`}
                      >
                        <td className="px-4 py-4">
                          <span className="font-semibold">
                            {transaction.artist}
                          </span>
                          <span className="mt-1 block max-w-sm text-xs leading-5 text-muted-foreground">
                            {transaction.notes}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono">
                          {transaction.transactionYear}
                        </td>
                        <td className="px-4 py-4 text-base font-semibold tabular-nums">
                          {transaction.reportedValue
                            ? money(transaction.reportedValue, 0)
                            : 'Undisclosed'}
                        </td>
                        <td className="px-4 py-4 font-mono">
                          {transaction.reportedMultiple
                            ? `${transaction.reportedMultiple.toFixed(2)}×`
                            : 'Undisclosed'}
                          {transaction.multipleBasis && (
                            <span className="mt-1 block max-w-40 font-sans text-xs leading-5 text-muted-foreground">
                              {transaction.multipleBasis}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {transaction.rightsIncluded.join(', ')}
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                            {transaction.comparability}
                          </span>
                        </td>
                        <td className="px-4 py-4">
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
            </Card>
          </TabsContent>
        </Tabs>

        <footer className="mt-12 border-t border-border py-6 text-xs leading-5 text-muted-foreground">
          Catalog Underwriter is an educational analytical tool based on
          publicly available information and user-defined assumptions. Estimates
          do not represent verified royalty statements, ownership interests,
          market offers, investment advice, or legal advice.
        </footer>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/90 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-3.5 px-4 py-2.5 sm:px-6">
          <CatalogArtwork name={catalog.artist.name} size="small" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">
              {catalog.artist.name} — Catalog
            </p>
            <p className="text-xs text-muted-foreground">
              {active ? `${scenarioLabel} case` : 'Needs a cash flow'}
            </p>
          </div>
          {results.data && active && (
            <div
              className="hidden min-w-0 flex-1 gap-1 sm:grid"
              aria-hidden="true"
            >
              {(() => {
                const bear = results.data.bear.catalogValue;
                const bull = results.data.bull.catalogValue;
                const low = Math.min(bear, active.catalogValue) * 0.9;
                const high = Math.max(bull, active.catalogValue) * 1.05;
                const position = (value: number) =>
                  ((value - low) / (high - low)) * 100;
                return (
                  <>
                    <div className="relative h-1 rounded-full bg-secondary">
                      <div
                        className="absolute inset-y-0 rounded-full bg-border"
                        style={{
                          left: `${position(bear)}%`,
                          width: `${position(bull) - position(bear)}%`,
                        }}
                      />
                      <div
                        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent transition-[left]"
                        style={{ left: `${position(active.catalogValue)}%` }}
                      />
                    </div>
                    <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                      <span>{money(bear)}</span>
                      <span>bear · base · bull</span>
                      <span>{money(bull)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
          <div className="ml-auto text-right">
            <p className="text-xl font-semibold tracking-[-0.02em] tabular-nums">
              {active ? money(active.catalogValue) : '—'}
            </p>
            <p
              className={cn(
                'font-mono text-xs',
                changeFromDefaults == null || Math.abs(changeFromDefaults) < 5e5
                  ? 'text-muted-foreground'
                  : changeFromDefaults > 0
                    ? 'text-positive'
                    : 'text-negative',
              )}
            >
              {changeFromDefaults == null || Math.abs(changeFromDefaults) < 5e5
                ? 'at defaults'
                : `${signedMoney(changeFromDefaults)} vs default`}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
