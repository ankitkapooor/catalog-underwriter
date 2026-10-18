import type { RightsEconomicsAssumptions } from '../lib/valuation/rights-economics.ts';

export const RIGHTS_ECONOMICS_VERSION = 'rights-economics-2.0.0';

/**
 * Default economics for a modeled public underwrite. Every value is an
 * editable assumption, not a platform rate card, and the user can blank any
 * of them to stop the automatic estimate.
 *
 * Audio, recorded share per 1,000 on-demand audio streams. Spotify reported
 * paying rights holders $11B in 2025 and, citing Luminate, carrying 65% of
 * roughly 5T global audio streams: about $3.40 per 1,000 for masters and
 * publishing together, or about $2.60 for masters alone. Apple Music and
 * Amazon pay more per stream, so the base sits above the Spotify-only figure.
 *
 * YouTube, recorded share per 1,000 views. Industry sources quoted by
 * Rolling Stone put YouTube at $0.60–$2.00 per 1,000 views for all rights
 * holders; about three quarters of that is the recording side.
 *
 * Publishing as a share of recorded revenue. Publishers receive roughly 15%
 * of streaming revenue against roughly 52–55% for labels.
 *
 * Other revenue as a share of recorded streaming revenue. Streaming is about
 * 70% of global recorded revenue (IFPI), so physical, downloads and
 * performance rights add up to about 0.43× streaming industry-wide. New
 * releases take most physical sales, so the base case for a catalog is lower.
 * Sync is excluded because the DCF applies its own sync uplift.
 */
export const defaultRightsEconomicsAssumptions: RightsEconomicsAssumptions = {
  low: {
    audioEffectiveRightsRevenuePerThousand: 2.6,
    youtubeEffectiveRightsRevenuePerThousand: 0.45,
    publishingRevenueAsShareOfRecorded: 0.24,
    otherRevenueAsShareOfRecorded: 0.15,
  },
  base: {
    audioEffectiveRightsRevenuePerThousand: 3.2,
    youtubeEffectiveRightsRevenuePerThousand: 0.8,
    publishingRevenueAsShareOfRecorded: 0.28,
    otherRevenueAsShareOfRecorded: 0.25,
  },
  high: {
    audioEffectiveRightsRevenuePerThousand: 3.8,
    youtubeEffectiveRightsRevenuePerThousand: 1.5,
    publishingRevenueAsShareOfRecorded: 0.31,
    otherRevenueAsShareOfRecorded: 0.43,
  },
};

export const RIGHTS_ECONOMICS_SOURCES = [
  {
    label: 'Spotify Loud & Clear (2025 payouts)',
    url: 'https://loudandclear.byspotify.com/',
  },
  {
    label: 'Spotify Q2 2025 earnings call: 65% of global audio streams',
    url: 'https://www.musicbusinessworldwide.com/learnings-from-spotifys-q2-2025-earnings-call-music-pro-tier/',
  },
  {
    label: 'IFPI Global Music Report 2026: streaming share of revenue',
    url: 'https://www.musicweek.com/labels/read/ifpi-global-recorded-music-revenue-up-6-in-2025-as-industry-embraces-the-future-on-ai/093789',
  },
  {
    label: 'Rolling Stone: YouTube pays $0.60–$2 per 1,000 views',
    url: 'https://www.rollingstone.com/music/music-news/youtubes-billion-dollar-payout-provides-new-revenue-for-musicians-107466/',
  },
] as const;
