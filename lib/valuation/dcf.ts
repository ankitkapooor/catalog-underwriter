export type ValuationAssumptions = {
  normalizedCashFlow: number;
  nearTermGrowthRate: number;
  matureGrowthRate: number;
  discountRate: number;
  terminalGrowthRate: number;
  masterRightsShare: number;
  publishingRightsShare: number;
  songwriterEconomicInterest: number;
  masterRevenueMix: number;
  adminFeeRate: number;
  syncUpliftRate: number;
  concentrationPremium: number;
  forecastYears: number;
};

export type ProjectedCashFlow = {
  year: number;
  grossCashFlow: number;
  economicCashFlow: number;
  presentValue: number;
};

export type DcfResult = {
  catalogValue: number;
  impliedMultiple: number;
  effectiveRightsShare: number;
  effectiveDiscountRate: number;
  forecast: ProjectedCashFlow[];
  presentValueYearsOneToFive: number;
  presentValueYearsSixToTen: number;
  presentValueTerminal: number;
  terminalValueShare: number;
};

const assertRate = (name: string, value: number) => {
  if (!Number.isFinite(value) || value <= -1 || value > 1) {
    throw new Error(`${name} must be between -100% and 100%.`);
  }
};

const clampShare = (value: number) => Math.min(1, Math.max(0, value));

export function calculateEconomicRightsShare(
  assumptions: ValuationAssumptions,
) {
  const masterMix = clampShare(assumptions.masterRevenueMix);
  const masterInterest = masterMix * clampShare(assumptions.masterRightsShare);
  const publishingInterest =
    (1 - masterMix) *
    clampShare(assumptions.publishingRightsShare) *
    clampShare(assumptions.songwriterEconomicInterest);

  return (
    (masterInterest + publishingInterest) *
    (1 - clampShare(assumptions.adminFeeRate))
  );
}

export function calculateDcf(assumptions: ValuationAssumptions): DcfResult {
  if (
    !Number.isFinite(assumptions.normalizedCashFlow) ||
    assumptions.normalizedCashFlow < 0
  ) {
    throw new Error('Normalized cash flow must be zero or greater.');
  }

  assertRate('Near-term growth', assumptions.nearTermGrowthRate);
  assertRate('Mature growth', assumptions.matureGrowthRate);
  assertRate('Discount rate', assumptions.discountRate);
  assertRate('Terminal growth', assumptions.terminalGrowthRate);

  const effectiveDiscountRate =
    assumptions.discountRate + assumptions.concentrationPremium;
  if (effectiveDiscountRate <= assumptions.terminalGrowthRate) {
    throw new Error(
      'Terminal growth must be below the effective discount rate.',
    );
  }
  if (
    !Number.isInteger(assumptions.forecastYears) ||
    assumptions.forecastYears < 1 ||
    assumptions.forecastYears > 50
  ) {
    throw new Error('Forecast period must be between 1 and 50 years.');
  }

  const effectiveRightsShare = calculateEconomicRightsShare(assumptions);
  const forecast: ProjectedCashFlow[] = [];
  let grossCashFlow =
    assumptions.normalizedCashFlow * (1 + assumptions.syncUpliftRate);

  for (let year = 1; year <= assumptions.forecastYears; year += 1) {
    const growthRate =
      year <= 5 ? assumptions.nearTermGrowthRate : assumptions.matureGrowthRate;
    grossCashFlow *= 1 + growthRate;
    const economicCashFlow = grossCashFlow * effectiveRightsShare;
    const presentValue = economicCashFlow / (1 + effectiveDiscountRate) ** year;
    forecast.push({ year, grossCashFlow, economicCashFlow, presentValue });
  }

  const finalCashFlow = forecast.at(-1)?.economicCashFlow ?? 0;
  const terminalCashFlow = finalCashFlow * (1 + assumptions.terminalGrowthRate);
  const terminalValueAtExit =
    terminalCashFlow / (effectiveDiscountRate - assumptions.terminalGrowthRate);
  const presentValueTerminal =
    terminalValueAtExit /
    (1 + effectiveDiscountRate) ** assumptions.forecastYears;
  const presentValueYearsOneToFive = forecast
    .slice(0, 5)
    .reduce((sum, item) => sum + item.presentValue, 0);
  const presentValueYearsSixToTen = forecast
    .slice(5)
    .reduce((sum, item) => sum + item.presentValue, 0);
  const catalogValue =
    presentValueYearsOneToFive +
    presentValueYearsSixToTen +
    presentValueTerminal;

  return {
    catalogValue,
    impliedMultiple:
      assumptions.normalizedCashFlow > 0
        ? catalogValue / assumptions.normalizedCashFlow
        : 0,
    effectiveRightsShare,
    effectiveDiscountRate,
    forecast,
    presentValueYearsOneToFive,
    presentValueYearsSixToTen,
    presentValueTerminal,
    terminalValueShare:
      catalogValue > 0 ? presentValueTerminal / catalogValue : 0,
  };
}
