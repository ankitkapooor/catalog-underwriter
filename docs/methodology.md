# Valuation methodology

Catalog Underwriter converts a normalized annual cash-flow base into an indicative value with deterministic code.

1. Apply the user-selected sync uplift to normalized catalog cash flow.
2. Weight master and publishing economics by their share of the modeled revenue mix.
3. Apply songwriter participation to the publishing portion.
4. Deduct administration and distribution fees.
5. Project years 1–5 with the near-term growth or decay assumption.
6. Project years 6–10 with the mature-catalog assumption.
7. Discount each annual economic cash flow at the base rate plus any optional concentration premium.
8. Calculate a Gordon-growth terminal value after year 10, requiring terminal growth to remain below the effective discount rate.
9. Sum the three disclosed value components: present value of years 1–5, years 6–10, and terminal value.

The implied multiple is catalog interest value divided by the normalized annual cash-flow input.

The public estimate is the least certain layer. The stored demo uses a versioned, range-based fixture. A live catalog without sufficient evidence must use known or hypothetical cash flow; the application does not infer earnings from release counts or Last.fm scrobbles alone.

## Public-demand cash-flow calibration

The live estimator is a separate, deterministic calibration layer (`public-cash-flow-1.0.0`). It aggregates absolute Last.fm top-track playcounts, peak listeners, the number of observations, release breadth, catalog age, and top-five concentration. These values are demand proxies: they are not royalty-bearing streams, direct Spotify payouts, or a lifetime catalog total.

An estimate is withheld unless at least 3 valid tracks, 100,000 aggregate playcounts, 10,000 peak listeners, and 1 release group are available. The midpoint is anchored at $250,000 for 25,000,000 playcounts, 1,000,000 peak listeners, and 12 release groups, then scales with playcount elasticity 0.55 and listener elasticity 0.25. Coverage uses a 25-track target with a 0.55 floor. Release breadth is `sqrt(release groups / 12)`, bounded to 0.6–1.4. Age is neutral at 10 years, changes by 1% per year, and is bounded to 0.85–1.15. Uncertainty starts at 0.15, adds 0.35 times the missing-coverage factor and 0.30 times top-five concentration. Base low/high multipliers are 0.80/1.25; adjusted multipliers are bounded to 0.25–0.70 and 1.40–2.50. The output is bounded between $25,000 and $50,000,000. Every estimate stores its inputs, confidence, methodology version, and retrieval timestamp.

See the in-product methodology page for the evidence policy and limitations.
