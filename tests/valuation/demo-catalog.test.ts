import assert from 'node:assert/strict';
import { test } from 'node:test';

import { defaultRightsEconomicsAssumptions } from '../../config/rights-economics.ts';
import { demoCatalog } from '../../data/demo-catalog.ts';
import storedEvidence from '../../data/kendrick-lamar-snapshot.json' with { type: 'json' };
import { modelPublicEconomics } from '../../lib/consumption/public-evidence.ts';

test('the demo runs stored public evidence through the live model', () => {
  const modeled = modelPublicEconomics(
    {
      lastFmTracks: storedEvidence.lastFmTracks,
      youtubeVideos: demoCatalog.youtubeVideos,
      retrievedAt: storedEvidence.retrievedAt,
    },
    defaultRightsEconomicsAssumptions,
  );

  assert.ok(demoCatalog.publicCashFlowEstimate);
  assert.deepEqual(
    demoCatalog.publicCashFlowEstimate,
    modeled.publicCashFlowEstimate,
  );
  assert.ok(demoCatalog.publicConsumptionEstimate?.audioStreamingEquivalent);
  assert.match(demoCatalog.publicCashFlowEstimate.note, /Modeled/);
});

test('the demo keeps the stored evidence it was captured with', () => {
  assert.equal(demoCatalog.isStoredDemo, true);
  assert.equal(demoCatalog.artist.name, 'Kendrick Lamar');
  assert.equal(demoCatalog.retrievedAt, storedEvidence.retrievedAt);
  assert.equal(demoCatalog.tracks.length, storedEvidence.lastFmTracks.length);
  assert.equal(
    demoCatalog.recordingCount.value,
    storedEvidence.officialRecordingCount,
  );
  assert.ok(demoCatalog.releases.length > 25);
  assert.ok(demoCatalog.tracks.every((track) => track.lastFmListeners != null));
});
