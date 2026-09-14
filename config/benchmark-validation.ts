/**
 * Broad validation bounds flag order-of-magnitude failures. They are not model
 * calibration targets and are never used to calculate a valuation.
 */
export const benchmarkValidation = {
  minimumReportedValueRatio: 0.25,
  maximumReportedValueRatio: 4,
} as const;
