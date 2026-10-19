# Valuation methodology

Catalog Underwriter converts a normalized annual cash-flow base into indicative values with deterministic code. It keeps five layers separate:

1. **Observed consumption** — cumulative or current measurements from named public sources.
2. **Modeled consumption** — current annual/run-rate estimates with an explicit annualization method.
3. **Economic assumption** — editable low, base, and high effective rights-holder economics.
4. **Estimated cash flow** — annual consumption multiplied by the selected rights economics.
5. **Valuation** — DCF and market-multiple approaches applied to normalized annual cash flow.

MusicBrainz supplies catalog evidence. Last.fm supplies cumulative demand evidence. When configured, YouTube supplies cumulative view counts for conservatively matched official videos, official audio, and artist-topic uploads. None of these sources directly supplies royalty income.

## Consumption and rights economics

Last.fm supports relative artist scale, track concentration, catalog breadth, long-tail strength, and demand persistence. Cumulative Last.fm scrobbles and YouTube views remain labeled `cumulative-observation`; on their own they are not treated as annual revenue.

`PublicConsumptionEstimate` holds annual audio-streaming-equivalent and YouTube-view ranges when current annual/run-rate evidence or a disclosed modeled annualization is available. Missing evidence remains `null`. Live underwrites use two calibrated annualizations (`config/consumption-annualization.ts`), both labeled `modeled-annualization`:

- **Audio streams from Last.fm listeners.** Listeners are summed across the artist's top 25 Last.fm tracks and multiplied by 65 / 150 / 445 annual whole-catalog Spotify streams per top-track listener, then divided by Spotify's reported 65% share of global audio streams. The factors are the 10th / 50th / 90th percentiles across 29 artists, so the range holds 23 of them (an interquartile range held only 15), measured on 2026-10-18 by annualizing each artist's latest daily Spotify streams as lead artist on kworb.net and dividing by the Last.fm listeners of the same artist's top 25 tracks. Using only the top 25 in both calibration and production keeps the long tail inside the factor. Listeners predicted held-out artists better than scrobbles (typical error ×1.43 against ×1.53) because heavy-rotation fan bases inflate scrobbles. Individual artists still miss by up to 5×: Last.fm under-represents mainstream pop, hip-hop, and Latin audiences (Bad Bunny, Taylor Swift, Drake sit far above the median) and over-represents indie and rock (The Strokes, Radiohead sit far below).
- **YouTube views from matched official uploads.** Each upload's lifetime views per year (over at least one year) is multiplied by 0.35 / 0.75 / 2.05, the 10th / 50th / 90th percentiles of the trailing-12-month-to-lifetime-average ratio measured on 93 official videos from 24 artists. Unmatched uploads are not counted, so the range is a floor.

`RightsEconomics` models audio streaming, YouTube, publishing, and other revenue separately under editable low, base, and high assumptions (`config/rights-economics.ts`):

| Assumption                               | Low   | Base  | High  | Basis                                                                                                                                             |
| ---------------------------------------- | ----- | ----- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recorded revenue per 1,000 audio streams | $2.60 | $3.20 | $3.80 | Spotify's $11B 2025 payout over ~65% of ~5T global streams ≈ $3.40 per 1,000 for masters and publishing, ≈ $2.60 for masters; other DSPs pay more |
| Recorded revenue per 1,000 YouTube views | $0.45 | $0.80 | $1.50 | Industry sources' $0.60–$2.00 per 1,000 views for all rights holders, recording side ≈ 75%                                                        |
| Publishing as share of recorded          | 24%   | 28%   | 31%   | Publishers ≈ 15% of streaming revenue against labels ≈ 52–55%                                                                                     |
| Other revenue as share of recorded       | 15%   | 25%   | 43%   | Streaming ≈ 70% of recorded revenue (IFPI); catalogs see less new-release physical. Sync is excluded because the DCF applies its own uplift       |

The modeled normalized cash flow is the low, base, and high rights revenue (`lib/valuation/public-cash-flow.ts`). It pre-fills the valuation with low confidence and is labeled as modeled throughout the workbench. Editing any rate updates it; blanking one turns it off. Switching to Known cash flow replaces it with a verified or hypothetical figure.

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

Default assumptions are anchored to how the catalog market prices income rather than fitted to individual deals (`config/valuation-defaults.ts`):

| Case | Discount rate | Growth, years 1–5 / 6–10 / terminal | Value ÷ cash flow | Anchor                                                                                                                                            |
| ---- | ------------- | ----------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bear | 9.6%          | +2% / +1% / +1%, 10% rights haircut | ≈10.6×            | Shot Tower's 9.63% weighted rate in its 2024 Hipgnosis re-valuation                                                                               |
| Base | 8.5%          | +5% / +2% / +2%                     | ≈17.3×            | Citrin Cooperman's 8.5% Hipgnosis rate; IFPI recorded revenue growth of 4.8–6.4% a year; Citrin's 16.7–17.6× multiples for older catalogs in 2024 |
| Bull | 7.5%          | +6% / +3% / +2.5%                   | ≈23.6×            | The 2021–22 peak, when iconic catalogs traded around 19–25×                                                                                       |

Earlier defaults (10.5% with shrinking cash flows) valued catalogs at about 8.4×, roughly half of observed market multiples.

The market method calculates normalized annual cash flow × the user-selected multiple. Initial multiple ranges are derived at runtime from the curated transaction dataset's disclosed income multiples, grouped into younger masters, mature masters, publishing, and combined masters + publishing. When a category has too few disclosed observations, the UI explicitly labels the broader cross-category proxy.

The reconciled indicative range spans the selected DCF result and the transaction-derived market band. It is not a mechanical average.

## Benchmark validation

Curated catalog transactions are validation evidence, not calibration targets. The benchmark framework first checks that an automatic candidate has annual-consumption evidence, then applies a deliberately broad order-of-magnitude sanity band. It never fits Last.fm activity to transaction price; the annualization is calibrated against public stream counts instead.

The stored Kendrick Lamar demo keeps the raw public evidence from a live lookup (releases, Last.fm top tracks, matched YouTube uploads, recording count) and runs it through the same annualization and rights economics, so the homepage value always matches the current model. A live catalog without Last.fm or YouTube evidence has no annual consumption and still requires a known or hypothetical cash-flow entry.

See the in-product methodology page for the evidence policy and limitations.
