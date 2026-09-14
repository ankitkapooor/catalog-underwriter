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

See the in-product methodology page for the evidence policy and limitations.
