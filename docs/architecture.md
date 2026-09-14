# Architecture

```text
Browser
  ├─ artist search ───────────────► /api/artists/search
  ├─ live catalog request ────────► /api/artists/[musicbrainz-id]
  └─ editable assumptions
            │
            ▼
Pure TypeScript financial core
  ├─ rights-weighted cash flow
  ├─ 10-year DCF + terminal value
  ├─ bear / base / bull scenarios
  ├─ sensitivity matrix
  ├─ concentration analysis
  └─ Break the Deal diagnostics

Server provider layer
  ├─ MusicBrainz (identity, releases, genres)
  ├─ Last.fm, optional (relative track demand only)
  └─ YouTube Data API, optional (cumulative likely-official views only)

Repository data
  ├─ stored demo snapshot
  └─ cited comparable transactions
```

## Boundaries

The React components render and edit structured data. They never implement finance calculations. Provider adapters return the application-owned catalog model so external response shapes do not leak into the financial engine.

The demo snapshot and every external field preserve provenance, retrieval time, confidence, method, and observation timing where applicable. Live requests continue with partial data when Last.fm or YouTube is unavailable. The application never substitutes fake values for missing evidence and never converts cumulative demand signals directly into cash flow.

## Runtime

The app uses Vinext and the OpenAI Sites Vite integration, producing a Cloudflare Worker-compatible server build. The in-memory request limiter is deliberately lightweight for the repository-first milestone; production hosting should replace it with a durable edge limiter if traffic warrants it.
