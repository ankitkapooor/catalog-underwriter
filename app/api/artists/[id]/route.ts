import { LastFmPerformanceProvider } from '@/lib/providers/lastfm';
import { MusicBrainzCatalogProvider } from '@/lib/providers/musicbrainz';
import type { LastFmTrackSignal } from '@/lib/providers/catalog-provider';
import { YouTubeDataApiProvider } from '@/lib/providers/youtube';
import {
  annualizeLastFmAudio,
  annualizeYouTubeViews,
} from '@/lib/consumption/annualization';
import { buildPublicConsumptionEstimate } from '@/lib/consumption/public-consumption';
import { allowRequest } from '@/lib/server/rate-limit';
import { buildModeledCashFlowEstimate } from '@/lib/valuation/public-cash-flow';
import { defaultRightsEconomicsAssumptions } from '@/config/rights-economics';
import type { TrackEvidence } from '@/types/catalog';

const MUSICBRAINZ_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function providerFailureDetail(
  provider: 'Last.fm' | 'YouTube',
  error: unknown,
) {
  const reason =
    error instanceof Error && /returned \d{3}/.test(error.message)
      ? error.message
      : `${provider} request failed`;
  return `${reason}. The MusicBrainz catalog still loaded; no replacement data was fabricated.`;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const client =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for') ??
    'local';

  if (!allowRequest(`artist-detail:${client}`, 20)) {
    return Response.json(
      {
        error: 'Too many catalog requests. Please wait a minute and try again.',
      },
      { status: 429 },
    );
  }
  if (!MUSICBRAINZ_ID.test(id)) {
    return Response.json(
      { error: 'The selected artist identifier is invalid.' },
      { status: 400 },
    );
  }

  try {
    const catalog = await new MusicBrainzCatalogProvider().getArtistCatalog(id);
    const retrievedAt = new Date().toISOString();
    let lastFmSignals: LastFmTrackSignal[] = [];
    const lastFmApiKey = process.env.LASTFM_API_KEY;

    if (lastFmApiKey) {
      try {
        lastFmSignals = await new LastFmPerformanceProvider(
          lastFmApiKey,
        ).getTopTrackSignals(catalog.artist.name, catalog.artist.musicBrainzId);
        const total = lastFmSignals.reduce(
          (sum, track) => sum + track.playcount,
          0,
        );
        catalog.tracks = lastFmSignals.map<TrackEvidence>((track, index) => ({
          id: `lastfm-${index}`,
          title: track.name,
          demandShare: total > 0 ? (track.playcount / total) * 100 : 0,
          observationTiming: 'cumulative-observation',
          lastFmPlaycount: track.playcount,
          lastFmListeners: track.listeners,
          observedMetric: `${track.playcount.toLocaleString('en-US')} Last.fm scrobbles`,
          source: {
            value: `${track.playcount} scrobbles; ${track.listeners} listeners`,
            source: 'Last.fm artist top tracks',
            sourceUrl: track.sourceUrl,
            retrievedAt,
            confidence: 'medium',
            method: 'observed',
            note: 'Used only for relative demand and concentration—not as a direct revenue measure.',
          },
        }));
        const performanceCoverage = catalog.coverage.find(
          (item) => item.label === 'Public performance',
        );
        if (performanceCoverage) {
          performanceCoverage.level = lastFmSignals.length
            ? 'Moderate'
            : 'Unavailable';
          performanceCoverage.detail = lastFmSignals.length
            ? `${lastFmSignals.length} Last.fm track observations support relative demand analysis.`
            : 'Last.fm returned no top-track observations.';
        }
      } catch (error) {
        const performanceCoverage = catalog.coverage.find(
          (item) => item.label === 'Public performance',
        );
        if (performanceCoverage) {
          performanceCoverage.level = 'Unavailable';
          performanceCoverage.detail = providerFailureDetail('Last.fm', error);
        }
      }
    }

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (youtubeApiKey) {
      const youtubeCoverage = catalog.coverage.find(
        (item) => item.label === 'YouTube consumption',
      );
      try {
        catalog.youtubeVideos = await new YouTubeDataApiProvider(
          youtubeApiKey,
        ).getOfficialVideoEvidence(catalog.artist.name);
        if (youtubeCoverage) {
          youtubeCoverage.level = catalog.youtubeVideos.length
            ? 'Moderate'
            : 'Unavailable';
          youtubeCoverage.detail = catalog.youtubeVideos.length
            ? `${catalog.youtubeVideos.length} likely official uploads provide cumulative-view evidence.`
            : 'No official uploads passed conservative artist and channel matching.';
        }
      } catch (error) {
        if (youtubeCoverage) {
          youtubeCoverage.level = 'Unavailable';
          youtubeCoverage.detail = providerFailureDetail('YouTube', error);
        }
      }
    }

    const audioAnnualization = annualizeLastFmAudio(lastFmSignals);
    const youtubeAnnualization = annualizeYouTubeViews(
      catalog.youtubeVideos,
      retrievedAt,
    );
    catalog.publicConsumptionEstimate = buildPublicConsumptionEstimate({
      lastFmTracks: lastFmSignals,
      youtubeVideos: catalog.youtubeVideos,
      audioAnnualization,
      youtubeAnnualization,
      retrievedAt,
    });
    catalog.publicCashFlowEstimate = buildModeledCashFlowEstimate(
      catalog.publicConsumptionEstimate,
      defaultRightsEconomicsAssumptions,
    );

    const annualCoverage = catalog.coverage.find(
      (item) => item.label === 'Annual consumption',
    );
    if (annualCoverage && (audioAnnualization || youtubeAnnualization)) {
      const modeled = [
        audioAnnualization && 'audio streams from Last.fm listeners',
        youtubeAnnualization && 'YouTube views from matched official uploads',
      ]
        .filter(Boolean)
        .join(' and ');
      annualCoverage.level = 'Low';
      annualCoverage.detail = `Annual ${modeled} are modeled with a disclosed calibration, not platform-reported run rates.`;
    }
    const cashFlowCoverage = catalog.coverage.find(
      (item) => item.label === 'Normalized cash flow',
    );
    if (cashFlowCoverage && catalog.publicCashFlowEstimate) {
      cashFlowCoverage.level = 'Low';
      cashFlowCoverage.detail =
        'Modeled from annual consumption × default rights economics. Edit the rates in the Evidence room or enter a known cash flow.';
    }

    return Response.json({ catalog });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Catalog data is temporarily unavailable.',
      },
      { status: 503 },
    );
  }
}
