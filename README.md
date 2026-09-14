# Catalog Underwriter

**Underwrite a music catalog using only what the public can see.**

Catalog Underwriter is an interactive public-data workbench for reconstructing a musical catalog, estimating its economic cash-flow range, and testing what a selected interest may be worth. It separates observed evidence, calculated fields, estimates, and user assumptions throughout the product.

## Overview

The repository includes a complete stored demonstration underwrite for Kendrick Lamar and live MusicBrainz artist resolution. A user can inspect evidence coverage, override cash flow, edit rights and capital assumptions, compare bear/base/bull cases, use a two-dimensional DCF sensitivity matrix, review concentration, and run deterministic “Break the Deal” diagnostics.

## Why this exists

Music catalogs trade like financial assets, but royalty statements and contracts are usually private. This project explores what disciplined underwriting can still do with public evidence—without claiming actual artist income, inventing ownership, or letting an LLM decide the valuation.

## How it works

```text
Public evidence → explicit assumptions → deterministic cash flow → DCF → user judgment
```

- MusicBrainz resolves ambiguous artist identities and returns public catalog structure.
- An optional server-side Last.fm adapter adds relative track-demand evidence.
- A versioned stored snapshot makes the main demonstration reliable without live APIs.
- Pure TypeScript functions calculate cash flow, DCF, scenarios, sensitivity, concentration, and risk diagnostics.
- Missing data stays visible as unknown; live catalogs without sufficient evidence require a user-entered cash-flow base.

## Architecture

The application uses Vinext, React 19, TypeScript, Tailwind CSS, restyled shadcn primitives, and Recharts. Provider adapters are separated from application types and the financial engine. See [docs/architecture.md](docs/architecture.md).

## Data sources

- [MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API): artist identity, release groups, dates, types, and genres.
- [Last.fm](https://www.last.fm/api/show/artist.getTopTracks): optional relative demand and concentration evidence only.
- Repository-managed comparable transactions: each record links to an original announcement and, when different, a reported-price source.

## Valuation methodology

The engine projects ten explicit annual periods and a Gordon-growth terminal value. Master and publishing interests are weighted separately before fees. Terminal growth must be below the effective discount rate. See [docs/methodology.md](docs/methodology.md) and the in-product `/methodology` page.

## Known limitations

- Public data cannot verify royalty income, rights ownership, recoupment, or private contract terms.
- MusicBrainz coverage varies and its live lightweight route does not perform recording-level normalization.
- Last.fm is a relative-demand signal, not a royalty or total-market stream count.
- The demo cash-flow range is an explicit model estimate from a stored fixture, not a factual claim about artist earnings.
- Request throttling is process-local until production hosting adds durable edge infrastructure.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The stored demo works without API credentials.

## Environment variables

`LASTFM_API_KEY` is optional. When present, the server retrieves Last.fm top-track signals for live artist underwrites. Secrets remain server-side and `.env.local` is ignored by Git.

## Testing

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

The automated fixtures cover DCF present value, terminal guardrails, rights weighting, scenario order, discount-rate sensitivity, and concentration.

## Deployment

The production target is `catalog.ankitkapoor.me`. The repository is compatible with the OpenAI Sites / Cloudflare Worker build path. Deployment and custom-domain configuration are intentionally deferred to the hosting milestone.

## Roadmap

- Rights-term runoff and copyright-life override
- Bid mode, target IRR, and maximum purchase price
- Shareable valuation snapshots
- Richer public-performance coverage
- Generated investment memo constrained to deterministic outputs
- Portfolio integration at `ankitkapoor.me/work/catalog-underwriter`

## Disclaimer

Catalog Underwriter is an educational analytical tool based on publicly available information and user-defined assumptions. Estimates do not represent verified royalty statements, ownership interests, market offers, investment advice, or legal advice.
