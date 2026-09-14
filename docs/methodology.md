# Valuation methodology

Catalog Underwriter converts a normalized annual cash-flow base into indicative values with deterministic code. It keeps five layers separate:

1. **Observed consumption** — cumulative or current measurements from named public sources.
2. **Modeled consumption** — current annual/run-rate estimates with an explicit annualization method.
3. **Economic assumption** — editable low, base, and high effective rights-holder economics.
4. **Estimated cash flow** — annual consumption multiplied by the selected rights economics.
5. **Valuation** — DCF and market-multiple approaches applied to normalized annual cash flow.

MusicBrainz supplies catalog evidence. Last.fm supplies cumulative demand evidence. When configured, YouTube supplies cumulative view counts for conservatively matched official videos, official audio, and artist-topic uploads. None of these sources directly supplies royalty income.

## Consumption and rights economics

Last.fm supports relative artist scale, track concentration, catalog breadth, long-tail strength, and demand persistence. It never directly produces dollar cash flow. Cumulative Last.fm scrobbles and YouTube views remain labeled `cumulative-observation`; they are not treated as annual revenue.

`PublicConsumptionEstimate` holds annual audio-streaming-equivalent and YouTube-view ranges only when current annual/run-rate evidence or a disclosed modeled annualization is available. Missing evidence remains `null`.

`RightsEconomics` models audio streaming, YouTube, publishing, and other revenue separately. Its low, base, and high assumptions are blank by default and editable by the user. It does not claim a fixed Spotify or platform payout. Automatic annual cash flow remains unavailable unless both annual consumption and the necessary rights-economic assumptions exist.

## Valuation methods

The DCF method:

1. Apply the user-selected sync uplift to normalized catalog cash flow.
2. Weight master and publishing economics by their share of the modeled revenue mix.
3. Apply songwriter participation to the publishing portion.
4. Deduct administration and distribution fees.
5. Project years 1–5 with the near-term growth or decay assumption.
6. Project years 6–10 with the mature-catalog assumption.
7. Discount each annual economic cash flow at the base rate plus any optional concentration premium.
8. Calculate a Gordon-growth terminal value after year 10, requiring terminal growth to remain below the effective discount rate.
9. Sum the three disclosed value components: present value of years 1–5, years 6–10, and terminal value.

The implied DCF multiple is catalog interest value divided by the normalized annual cash-flow input.

The market method calculates normalized annual cash flow × the user-selected multiple. Initial multiple ranges are derived at runtime from the curated transaction dataset's disclosed income multiples, grouped into younger masters, mature masters, publishing, and combined masters + publishing. When a category has too few disclosed observations, the UI explicitly labels the broader cross-category proxy.

The reconciled indicative range spans the selected DCF result and the transaction-derived market band. It is not a mechanical average.

## Benchmark validation

Curated catalog transactions are validation evidence, not calibration targets. The benchmark framework first checks that an automatic candidate has annual-consumption evidence, then applies a deliberately broad order-of-magnitude sanity band. It never fits Last.fm activity to transaction price.

The stored demo cash-flow range is an illustrative analyst assumption. A live catalog without sufficient annual evidence requires a known or hypothetical cash-flow entry.

See the in-product methodology page for the evidence policy and limitations.
