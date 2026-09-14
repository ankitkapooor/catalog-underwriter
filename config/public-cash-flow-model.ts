/**
 * Automatic public cash-flow estimation is intentionally disabled.
 *
 * Last.fm and MusicBrainz provide demand and catalog evidence, not annual
 * royalty income. A future automatic estimate may only be enabled after the
 * application has defensible annual-consumption evidence and explicit,
 * editable rights-holder economics.
 */
export const PUBLIC_CASH_FLOW_AUTOMATION_ENABLED = false as const;

export const PUBLIC_CASH_FLOW_DISABLED_REASON =
  'Automatic economic cash-flow estimate not yet available from sufficient public evidence.';

export const PUBLIC_CASH_FLOW_METHODOLOGY_VERSION =
  'public-cash-flow-disabled-2.0.0';
